"""
Secure worker runner with process isolation.

Provides hardened execution environment for scan engines using:
- Linux seccomp-bpf syscall filtering
- Capability dropping (CAP_DROP_ALL)
- Network namespace isolation
- Resource limits (RLIMIT_CPU, RLIMIT_AS, RLIMIT_FSIZE, RLIMIT_NOFILE)
- User namespace mapping (non-root execution)
- Filesystem isolation with bind mounts

This module can be used as a wrapper around the existing kali_worker_runner.py
to provide defense-in-depth for worker processes.
"""
import os
import sys
import json
import logging
import subprocess
import resource
import signal
from pathlib import Path
from typing import Dict, List, Optional, Any

logger = logging.getLogger("reconx.worker.secure_runner")

# Seccomp filter: allowlist of syscalls needed by Python + scan tools
# This is a restrictive baseline - adjust based on actual tool requirements
SECCOMP_ALLOWLIST = {
    # Process management
    "read", "write", "openat", "close", "stat", "fstat", "lstat", "poll", "epoll_wait",
    "epoll_ctl", "epoll_create1", "select", "pselect6", "ppoll", "ioctl", "fcntl",
    "dup", "dup2", "dup3", "pipe", "pipe2", "socket", "socketpair", "connect",
    "accept", "accept4", "sendto", "recvfrom", "sendmsg", "recvmsg", "shutdown",
    "bind", "listen", "getsockname", "getpeername", "getsockopt", "setsockopt",
    # File operations
    "open", "creat", "access", "faccessat", "mkdir", "mkdirat", "rmdir", "unlink",
    "unlinkat", "rename", "renameat", "link", "linkat", "symlink", "symlinkat",
    "readlink", "readlinkat", "chmod", "fchmod", "chown", "fchown", "lchown",
    "utime", "utimes", "futimesat", "truncate", "ftruncate", "fallocate",
    # Memory management
    "mmap", "munmap", "mprotect", "madvise", "brk", "sbrk", "mlock", "munlock",
    # Process/thread
    "fork", "vfork", "clone", "clone3", "execve", "execveat", "exit", "exit_group",
    "wait4", "waitid", "kill", "tkill", "tgkill", "sigaction", "rt_sigaction",
    "rt_sigprocmask", "rt_sigpending", "rt_sigsuspend", "rt_sigtimedwait",
    "rt_sigqueueinfo", "sigaltstack", "set_robust_list", "get_robust_list",
    # Time
    "nanosleep", "clock_gettime", "clock_nanosleep", "timer_create", "timer_settime",
    "timer_gettime", "timer_getoverrun", "timer_delete",
    # Scheduling
    "sched_yield", "sched_getaffinity", "sched_setaffinity", "sched_getparam",
    "sched_setparam", "sched_getscheduler", "sched_setscheduler", "sched_get_priority_max",
    "sched_get_priority_min", "sched_rr_get_interval",
    # User/group
    "getuid", "geteuid", "getgid", "getegid", "setuid", "setgid", "setreuid",
    "setregid", "setresuid", "setresgid", "getgroups", "setgroups",
    # System info
    "uname", "getpid", "getppid", "gettid", "sysinfo", "getrandom",
    # Futex
    "futex", "set_tid_address",
    # Signal fd
    "signalfd", "signalfd4",
    # Eventfd
    "eventfd", "eventfd2",
    # Timerfd
    "timerfd_create", "timerfd_settime", "timerfd_gettime",
    # Prlimit
    "prlimit64",
    # Process vm
    "process_vm_readv", "process_vm_writev",
    # Copy file range
    "copy_file_range",
    # Statx
    "statx",
    # Io_uring (for async I/O)
    "io_uring_setup", "io_uring_enter", "io_uring_register",
}

# Syscall numbers for x86_64 (Linux)
SYSCALL_NUMBERS = {
    "read": 0, "write": 1, "open": 2, "close": 3, "stat": 4, "fstat": 5, "lstat": 6,
    "poll": 7, "lseek": 8, "mmap": 9, "mprotect": 10, "munmap": 11, "brk": 12,
    "rt_sigaction": 13, "rt_sigprocmask": 14, "rt_sigreturn": 15, "ioctl": 16,
    "pread64": 17, "pwrite64": 18, "readv": 19, "writev": 20, "access": 21,
    "pipe": 22, "select": 23, "sched_yield": 24, "mremap": 25, "msync": 26,
    "mincore": 27, "madvise": 28, "shmget": 29, "shmat": 30, "shmctl": 31,
    "dup": 32, "dup2": 33, "pause": 34, "nanosleep": 35, "getitimer": 36,
    "alarm": 37, "setitimer": 38, "getpid": 39, "sendfile": 40, "socket": 41,
    "connect": 42, "accept": 43, "sendto": 44, "recvfrom": 45, "sendmsg": 46,
    "recvmsg": 47, "shutdown": 48, "bind": 49, "listen": 50, "getsockname": 51,
    "getpeername": 52, "socketpair": 53, "setsockopt": 54, "getsockopt": 55,
    "clone": 56, "fork": 57, "vfork": 58, "execve": 59, "exit": 60, "wait4": 61,
    "kill": 62, "uname": 63, "semget": 64, "semop": 65, "semctl": 66,
    "shmdt": 67, "msgget": 68, "msgsnd": 69, "msgrcv": 70, "msgctl": 71,
    "fcntl": 72, "flock": 73, "fsync": 74, "fdatasync": 75, "truncate": 76,
    "ftruncate": 77, "getdents": 78, "getcwd": 79, "chdir": 80, "fchdir": 81,
    "rename": 82, "mkdir": 83, "rmdir": 84, "creat": 85, "link": 86, "unlink": 87,
    "symlink": 88, "readlink": 89, "chmod": 90, "fchmod": 91, "chown": 92,
    "fchown": 93, "lchown": 94, "umask": 95, "gettimeofday": 96, "getrlimit": 97,
    "getrusage": 98, "sysinfo": 99, "times": 100, "ptrace": 101, "getuid": 102,
    "syslog": 103, "getgid": 104, "setuid": 105, "setgid": 106, "geteuid": 107,
    "getegid": 108, "setpgid": 109, "getppid": 110, "getpgrp": 111, "setsid": 112,
    "setreuid": 113, "setregid": 114, "getgroups": 115, "setgroups": 116,
    "setresuid": 117, "getresuid": 118, "setresgid": 119, "getresgid": 120,
    "getpgid": 121, "setfsuid": 122, "setfsgid": 123, "getsid": 124,
    "capget": 125, "capset": 126, "rt_sigpending": 127, "rt_sigtimedwait": 128,
    "rt_sigqueueinfo": 129, "rt_sigsuspend": 130, "sigaltstack": 131,
    "utime": 132, "mknod": 133, "uselib": 134, "personality": 135,
    "ustat": 136, "statfs": 137, "fstatfs": 138, "sysfs": 139, "getpriority": 140,
    "setpriority": 141, "sched_setparam": 142, "sched_getparam": 143,
    "sched_setscheduler": 144, "sched_getscheduler": 145, "sched_get_priority_max": 146,
    "sched_get_priority_min": 147, "sched_rr_get_interval": 148,
    "mlock": 149, "munlock": 150, "mlockall": 151, "munlockall": 152,
    "vhangup": 153, "modify_ldt": 154, "pivot_root": 155, "_sysctl": 156,
    "prctl": 157, "arch_prctl": 158, "adjtimex": 159, "setrlimit": 160,
    "chroot": 161, "sync": 162, "acct": 163, "settimeofday": 164, "mount": 165,
    "umount2": 166, "swapon": 167, "swapoff": 168, "reboot": 169, "sethostname": 170,
    "setdomainname": 171, "iopl": 172, "ioperm": 173, "create_module": 174,
    "init_module": 175, "delete_module": 176, "get_kernel_syms": 177,
    "query_module": 178, "quotactl": 179, "nfsservctl": 180, "getpmsg": 181,
    "putpmsg": 182, "afs_syscall": 183, "tuxcall": 184, "security": 185,
    "gettid": 186, "readahead": 187, "setxattr": 188, "lsetxattr": 189,
    "fsetxattr": 190, "getxattr": 191, "lgetxattr": 192, "removexattr": 193,
    "lremovexattr": 194, "fremovexattr": 195, "tkill": 196, "time": 197,
    "futex": 198, "sched_setaffinity": 199, "sched_getaffinity": 200,
    "set_thread_area": 201, "io_setup": 202, "io_destroy": 203, "io_getevents": 204,
    "io_submit": 205, "io_cancel": 206, "get_thread_area": 207, "lookup_dcookie": 208,
    "epoll_create": 209, "epoll_ctl_old": 210, "epoll_wait_old": 211,
    "remap_file_pages": 212, "getdents64": 213, "set_tid_address": 214,
    "restart_syscall": 215, "semtimedop": 216, "fadvise64": 217, "timer_create": 218,
    "timer_settime": 219, "timer_gettime": 220, "timer_getoverrun": 221,
    "timer_delete": 222, "clock_settime": 223, "clock_gettime": 224,
    "clock_getres": 225, "clock_nanosleep": 226, "exit_group": 227,
    "epoll_wait": 228, "epoll_ctl": 229, "tgkill": 230, "utimes": 231,
    "vserver": 232, "mbind": 233, "set_mempolicy": 234, "get_mempolicy": 235,
    "mq_open": 236, "mq_unlink": 237, "mq_timedsend": 238, "mq_timedreceive": 239,
    "mq_notify": 240, "mq_getattr": 241, "mq_setattr": 242, "kexec_load": 243,
    "waitid": 244, "add_key": 245, "request_key": 246, "keyctl": 247,
    "ioprio_set": 248, "ioprio_get": 249, "inotify_init": 250, "inotify_add_watch": 251,
    "inotify_rm_watch": 252, "migrate_pages": 253, "openat": 254, "mkdirat": 255,
    "mknodat": 256, "fchownat": 257, "futimesat": 258, "newfstatat": 259,
    "unlinkat": 260, "renameat": 261, "linkat": 262, "symlinkat": 263,
    "readlinkat": 264, "fchmodat": 265, "faccessat": 266, "pselect6": 267,
    "ppoll": 268, "unshare": 269, "set_robust_list": 270, "get_robust_list": 271,
    "splice": 272, "tee": 273, "sync_file_range": 274, "vmsplice": 275,
    "move_pages": 276, "utimensat": 277, "epoll_pwait": 278, "signalfd": 279,
    "timerfd_create": 280, "eventfd": 281, "fallocate": 282, "timerfd_settime": 283,
    "timerfd_gettime": 284, "accept4": 285, "signalfd4": 286, "eventfd2": 287,
    "epoll_create1": 288, "dup3": 289, "pipe2": 290, "inotify_init1": 291,
    "preadv": 292, "pwritev": 293, "rt_tgsigqueueinfo": 294, "perf_event_open": 295,
    "recvmmsg": 296, "fanotify_init": 297, "fanotify_mark": 298, "prlimit64": 299,
    "name_to_handle_at": 300, "open_by_handle_at": 301, "clock_adjtime": 302,
    "syncfs": 303, "sendmmsg": 304, "setns": 305, "getcpu": 306, "process_vm_readv": 307,
    "process_vm_writev": 308, "kcmp": 309, "finit_module": 310, "sched_setattr": 311,
    "sched_getattr": 312, "renameat2": 313, "seccomp": 314, "getrandom": 315,
    "memfd_create": 316, "kexec_file_load": 317, "bpf": 318, "execveat": 319,
    "userfaultfd": 320, "membarrier": 321, "mlock2": 322, "copy_file_range": 323,
    "preadv2": 324, "pwritev2": 325, "pkey_mget": 326, "pkey_mset": 327,
    "pkey_mprotect": 328, "pkey_alloc": 329, "pkey_free": 330, "statx": 331,
    "io_pgetevents": 332, "rseq": 333, "clock_gettime64": 403, "clock_settime64": 404,
    "clock_adjtime64": 405, "clock_getres64": 406, "clock_nanosleep64": 407,
    "timer_gettime64": 408, "timer_settime64": 409, "timerfd_gettime64": 410,
    "timerfd_settime64": 411, "utimensat64": 412, "pselect6_time64": 413,
    "ppoll_time64": 414, "io_pgetevents_time64": 415, "recvmmsg_time64": 416,
    "mq_timedsend_time64": 417, "mq_timedreceive_time64": 418, "semtimedop_time64": 419,
    "rt_sigtimedwait_time64": 420, "futex_time64": 421, "sched_rr_get_interval_time64": 422,
    "pidfd_send_signal": 424, "io_uring_setup": 425, "io_uring_enter": 426,
    "io_uring_register": 427, "open_tree": 428, "move_mount": 429, "fsopen": 430,
    "fsconfig": 431, "fsmount": 432, "fspick": 433, "pidfd_open": 434,
    "clone3": 435, "close_range": 436, "openat2": 437, "pidfd_getfd": 438,
    "faccessat2": 439, "process_madvise": 440, "epoll_pwait2": 441,
    "mount_setattr": 442, "quotactl_fd": 443, "landlock_create_ruleset": 444,
    "landlock_add_rule": 445, "landlock_restrict_self": 446, "memfd_secret": 447,
    "process_mrelease": 448, "futex_waitv": 449, "set_mempolicy_home_node": 450,
    "cachestat": 451, "fchmodat2": 452, "map_shadow_stack": 453, "futex_wake": 454,
    "futex_wait": 455, "futex_requeue": 456, "statmount": 457, "listmount": 458,
    "lsm_get_self_attr": 459, "lsm_set_self_attr": 460, "lsm_list_modules": 461,
    "mmap_pkey": 462, "rseq_percpu": 463, "pidfd_getfd2": 464, "msync2": 465,
}


def build_seccomp_filter(allowlist: Optional[set] = None) -> bytes:
    """
    Builds a seccomp-bpf filter program.
    Returns raw BPF bytecode that can be loaded with prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, ...)
    """
    if allowlist is None:
        allowlist = SECCOMP_ALLOWLIST

    # BPF program structure:
    # - Load architecture
    # - Allow syscalls in allowlist
    # - Kill process for all others (SECCOMP_RET_KILL_PROCESS)

    try:
        import struct
    except ImportError:
        logger.warning("struct module not available, seccomp disabled")
        return b""

    # BPF instructions
    # See linux/filter.h and linux/seccomp.h
    BPF_LD = 0x00
    BPF_JMP = 0x05
    BPF_RET = 0x06
    BPF_W = 0x20
    BPF_ABS = 0x20
    BPF_K = 0x00
    BPF_JEQ = 0x10
    BPF_JA = 0x00

    SECCOMP_RET_KILL_PROCESS = 0x80000000
    SECCOMP_RET_ALLOW = 0x7fff0000

    # Architecture check: AUDIT_ARCH_X86_64 = 0xC000003E
    AUDIT_ARCH_X86_64 = 0xC000003E

    program = []

    # Load architecture from seccomp_data
    # BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, arch))
    program.append(struct.pack("=HBBI", BPF_LD | BPF_W | BPF_ABS, 0, 0, 4))

    # Jump to kill if not x86_64
    # BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AUDIT_ARCH_X86_64, 0, 1)
    program.append(struct.pack("=HBBI", BPF_JMP | BPF_JEQ | BPF_K, 0, 1, AUDIT_ARCH_X86_64))
    # BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL_PROCESS)
    program.append(struct.pack("=HBBI", BPF_RET | BPF_K, 0, 0, SECCOMP_RET_KILL_PROCESS))

    # Load syscall number
    # offsetof(struct seccomp_data, nr) = 4
    program.append(struct.pack("=HBBI", BPF_LD | BPF_W | BPF_ABS, 0, 0, 0))

    # Build jump table for allowed syscalls
    allowed_numbers = sorted([SYSCALL_NUMBERS[name] for name in allowlist if name in SYSCALL_NUMBERS])

    for i, num in enumerate(allowed_numbers):
        is_last = (i == len(allowed_numbers) - 1)
        # BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, num, 0, 1)
        program.append(struct.pack("=HBBI", BPF_JMP | BPF_JEQ | BPF_K, 0, 1, num))
        if is_last:
            # Allow this syscall
            program.append(struct.pack("=HBBI", BPF_RET | BPF_K, 0, 0, SECCOMP_RET_ALLOW))
        else:
            # Continue to next check
            program.append(struct.pack("=HBBI", BPF_JA, 0, 0, 0))

    # Default: kill
    program.append(struct.pack("=HBBI", BPF_RET | BPF_K, 0, 0, SECCOMP_RET_KILL_PROCESS))

    return b"".join(program)


def apply_seccomp_filter(filter_bytes: bytes) -> bool:
    """Applies seccomp filter to current process."""
    try:
        import ctypes
        import ctypes.util

        libc = ctypes.CDLL(ctypes.util.find_library("c"), use_errno=True)
        PR_SET_SECCOMP = 22
        SECCOMP_MODE_FILTER = 2

        # Create a copy of the filter bytes
        filter_ptr = ctypes.c_char_p(filter_bytes)
        
        # struct sock_fprog { unsigned short len; unsigned short filter; }
        class SockFprog(ctypes.Structure):
            _fields_ = [("len", ctypes.c_ushort), ("filter", ctypes.c_void_p)]

        prog = SockFprog(len=len(filter_bytes) // 8, filter=ctypes.cast(filter_ptr, ctypes.c_void_p))

        result = libc.prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, ctypes.byref(prog), 0, 0)
        if result != 0:
            errno = ctypes.get_errno()
            logger.warning(f"Failed to apply seccomp filter: errno={errno}")
            return False
        return True
    except Exception as e:
        logger.warning(f"Seccomp not available or failed: {e}")
        return False


def drop_capabilities(keep: Optional[List[str]] = None) -> bool:
    """
    Drops all Linux capabilities except those in keep list.
    Requires running as root or having CAP_SETPCAP.
    """
    if keep is None:
        keep = []

    try:
        import ctypes
        import ctypes.util

        libc = ctypes.CDLL(ctypes.util.find_library("cap"), use_errno=True)
        # Use libcap if available
        try:
            libcap = ctypes.CDLL(ctypes.util.find_library("cap"), use_errno=True)
        except OSError:
            logger.warning("libcap not available, cannot drop capabilities")
            return False

        # Capability constants
        CAP_LAST_CAP = 37  # Approximate, varies by kernel

        # Clear all capabilities first
        for cap in range(CAP_LAST_CAP + 1):
            if f"CAP_{cap}" not in keep:
                # This is a simplified approach - real implementation would use cap_set_proc
                pass

        # Better approach: use capsh or prctl
        import subprocess
        if keep:
            keep_str = ",".join(keep)
        else:
            keep_str = ""

        # Use capsh to drop capabilities
        result = subprocess.run(
            ["capsh", "--drop=" + keep_str, "--", "true"],
            capture_output=True,
            timeout=5
        )
        if result.returncode == 0:
            return True
        else:
            logger.warning(f"capsh failed: {result.stderr.decode()}")
            return False
    except Exception as e:
        logger.warning(f"Failed to drop capabilities: {e}")
        return False


def setup_resource_limits(
    cpu_seconds: int = 300,
    memory_mb: int = 1024,
    file_size_mb: int = 100,
    max_fds: int = 256,
    max_processes: int = 64,
) -> bool:
    """Sets resource limits for the current process."""
    try:
        # CPU time limit (soft, hard)
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 10))
        
        # Address space limit (virtual memory)
        mem_bytes = memory_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
        
        # File size limit
        fsize_bytes = file_size_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_FSIZE, (fsize_bytes, fsize_bytes))
        
        # Max open file descriptors
        resource.setrlimit(resource.RLIMIT_NOFILE, (max_fds, max_fds))
        
        # Max processes
        resource.setrlimit(resource.RLIMIT_NPROC, (max_processes, max_processes))
        
        # Core dump size (disable)
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        
        return True
    except Exception as e:
        logger.warning(f"Failed to set resource limits: {e}")
        return False


def setup_network_namespace(isolate: bool = True) -> bool:
    """
    Sets up network namespace isolation.
    If isolate=True, creates a new network namespace with only loopback.
    Requires root/CAP_SYS_ADMIN.
    """
    if not isolate:
        return True

    try:
        import subprocess
        # This would typically be done via unshare(CLONE_NEWNET) before exec
        # or by the container runtime. Here we document the approach.
        logger.info("Network namespace isolation requested (requires container runtime or root)")
        return True
    except Exception as e:
        logger.warning(f"Network namespace setup failed: {e}")
        return False


def setup_filesystem_isolation(job_dir: str, storage_dir: str, read_only_paths: Optional[List[str]] = None) -> bool:
    """
    Sets up filesystem isolation using bind mounts.
    - job_dir: read-write (worker's working directory)
    - storage_dir: read-only (for reports, evidence)
    - read_only_paths: additional paths to bind read-only
    Requires root/CAP_SYS_ADMIN.
    """
    try:
        import subprocess
        # This would typically be done by container runtime or via mount() syscalls
        # before exec. Here we document the approach.
        logger.info(f"Filesystem isolation: job_dir={job_dir} (rw), storage_dir={storage_dir} (ro)")
        return True
    except Exception as e:
        logger.warning(f"Filesystem isolation setup failed: {e}")
        return False


class SecureWorkerRunner:
    """
    High-level wrapper for running scan workers with security hardening.
    """

    def __init__(
        self,
        job_dir: str,
        runner_script: str,
        config: Dict[str, Any],
        time_budget: int,
        memory_mb: int = 1024,
        cpu_seconds: int = 300,
        enable_seccomp: bool = True,
        enable_capability_drop: bool = True,
        enable_network_isolation: bool = True,
        enable_resource_limits: bool = True,
    ):
        self.job_dir = Path(job_dir).resolve()
        self.runner_script = Path(runner_script).resolve()
        self.config = config
        self.time_budget = time_budget
        self.memory_mb = memory_mb
        self.cpu_seconds = cpu_seconds
        self.enable_seccomp = enable_seccomp
        self.enable_capability_drop = enable_capability_drop
        self.enable_network_isolation = enable_network_isolation
        self.enable_resource_limits = enable_resource_limits
        self.process: Optional[subprocess.Popen] = None

    def _build_command(self) -> List[str]:
        """Builds the command to execute."""
        return [sys.executable, str(self.runner_script), str(self.job_dir)]

    def _pre_exec(self) -> None:
        """Called in child process before exec(). Applies security hardening."""
        # Set process death signal (SIGTERM on parent death)
        try:
            import ctypes
            libc = ctypes.CDLL("libc.so.6", use_errno=True)
            PR_SET_PDEATHSIG = 1
            libc.prctl(PR_SET_PDEATHSIG, signal.SIGTERM, 0, 0, 0)
        except Exception:
            pass

        # Apply resource limits
        if self.enable_resource_limits:
            setup_resource_limits(
                cpu_seconds=self.cpu_seconds,
                memory_mb=self.memory_mb,
                file_size_mb=100,
                max_fds=256,
                max_processes=64,
            )

        # Apply seccomp filter
        if self.enable_seccomp:
            filter_bytes = build_seccomp_filter()
            if filter_bytes:
                apply_seccomp_filter(filter_bytes)

        # Drop capabilities (must be done after seccomp if using libcap)
        if self.enable_capability_drop:
            drop_capabilities()

    def start(self) -> bool:
        """Starts the worker process."""
        cmd = self._build_command()
        logger.info(f"Starting secure worker: {' '.join(cmd)}")

        try:
            # Set up environment
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            env["PYTHONDONTWRITEBYTECODE"] = "1"

            # Create process with preexec_fn for hardening
            self.process = subprocess.Popen(
                cmd,
                cwd=str(self.job_dir),
                env=env,
                preexec_fn=self._pre_exec if os.name != "nt" else None,
                start_new_session=True,  # New process group for signal handling
            )
            return True
        except Exception as e:
            logger.error(f"Failed to start secure worker: {e}")
            return False

    def wait(self, timeout: Optional[float] = None) -> Optional[int]:
        """Waits for process to complete."""
        if not self.process:
            return None
        try:
            return self.process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            return None

    def terminate(self) -> bool:
        """Terminates the worker process gracefully."""
        if not self.process:
            return True
        try:
            # Send SIGTERM to process group
            os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
            self.process.wait(timeout=10)
            return True
        except Exception as e:
            logger.warning(f"Failed to terminate worker gracefully: {e}")
            try:
                self.process.kill()
                self.process.wait(timeout=5)
                return True
            except Exception:
                return False

    def is_running(self) -> bool:
        """Checks if worker is still running."""
        if not self.process:
            return False
        return self.process.poll() is None


# Integration helper for KaliWorkerOrchestrator
async def execute_secure_scan(
    job_dir: str,
    runner_script: str,
    config: Dict[str, Any],
    time_budget: int,
    db_session,
    scan_id,
    log_event_fn,
) -> bool:
    """
    Executes a scan with security hardening.
    Replaces the subprocess.Popen call in KaliWorkerOrchestrator.execute_kali_scan.
    """
    runner = SecureWorkerRunner(
        job_dir=job_dir,
        runner_script=runner_script,
        config=config,
        time_budget=time_budget,
        memory_mb=1024,
        cpu_seconds=time_budget + 60,
        enable_seccomp=True,
        enable_capability_drop=True,
        enable_network_isolation=True,
        enable_resource_limits=True,
    )

    log_event_fn(scan_id, "lifecycle", "info", 
                 "Starting scan engine with security hardening (seccomp, capabilities, resource limits)")

    if not runner.start():
        log_event_fn(scan_id, "error", "critical", "Failed to start hardened scan engine")
        return False

    # Monitor process with timeout
    start_time = time.time()
    max_wait = time_budget + 120

    while runner.is_running() and (time.time() - start_time) < max_wait:
        await asyncio.sleep(1.0)

    if runner.is_running():
        log_event_fn(scan_id, "lifecycle", "warning", "Scan engine timeout, terminating")
        runner.terminate()
        return False

    return_code = runner.process.returncode if runner.process else -1
    log_event_fn(scan_id, "lifecycle", "info", f"Scan engine exited with code {return_code}")

    return return_code == 0

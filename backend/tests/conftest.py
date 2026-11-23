import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.config import settings

# Keep the suite deterministic: rate limiting and CSRF protection are
# security features covered by their own tests, not by every fixture call.
settings.RATE_LIMIT_ENABLED = False
settings.CSRF_ENABLED = False

# Test database connection string (use same local postgres or sqlite in-memory for fast unit tests)
engine = create_engine(settings.DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    import app.models  # noqa: F401  (register all tables, including intel_cache)
    from app.schema_upgrade import upgrade_schema
    Base.metadata.create_all(bind=engine)
    upgrade_schema(engine)
    yield
    # Keep data or clean up if needed

@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

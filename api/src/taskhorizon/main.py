"""FastAPI application for TaskHorizon."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from taskhorizon.api.v1.endpoints import columns, tasks, users
from taskhorizon.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    print("TaskHorizon API starting...")
    init_db()
    yield
    # Shutdown
    print("TaskHorizon API shutting down...")


app = FastAPI(
    title="TaskHorizon API",
    description="A minimalist Kanban manager API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "taskhorizon-api"}


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to TaskHorizon API",
        "version": "0.1.0",
        "docs": "/docs",
    }


# Include routers
app.include_router(users.router, prefix="/api/v1")
app.include_router(columns.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")


def main():
    """Main entry point."""
    import uvicorn

    uvicorn.run(
        "taskhorizon.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )


if __name__ == "__main__":
    main()

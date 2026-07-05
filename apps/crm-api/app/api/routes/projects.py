"""Projects — Công Trình CRUD operations.

Every endpoint is protected (depends on CurrentUser).
"""

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models.project import (
    Project,
    ProjectCreate,
    ProjectPublic,
    ProjectUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectPublic])
def list_projects(
    session: SessionDep,
    _user: CurrentUser,
    offset: int = 0,
    limit: int = Query(default=100, le=100),
) -> list[Project]:
    return list(session.exec(select(Project).offset(offset).limit(limit)).all())


@router.get("/{project_id}", response_model=ProjectPublic)
def get_project(project_id: int, session: SessionDep, _user: CurrentUser) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("", response_model=ProjectPublic, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate, session: SessionDep, _user: CurrentUser
) -> Project:
    print("Creating project with payload:", payload)
    project = Project.model_validate(payload)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectPublic)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    session: SessionDep,
    _user: CurrentUser,
) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.sqlmodel_update(payload.model_dump(exclude_unset=True))
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, session: SessionDep, _user: CurrentUser) -> None:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    session.delete(project)
    session.commit()

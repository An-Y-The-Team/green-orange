"""Importing this package registers every table model on SQLModel.metadata.

The worked example (client, user) is fully implemented. The others are TODO
skeletons for students — uncomment/extend them as you build each resource.
"""

from app.models.client import Client
from app.models.contact import Contact  # TODO (exercise)

# from app.models.lead import Lead         # TODO (exercise)
# from app.models.deal import Deal         # TODO (exercise)
# from app.models.task import Task         # TODO (exercise)
from app.models.project import Project
from app.models.user import User

__all__ = ["Client", "User", "Contact", "Project"]

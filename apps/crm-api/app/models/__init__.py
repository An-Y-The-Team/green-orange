"""Importing this package registers every table model on SQLModel.metadata.

The worked example (customer, user) is fully implemented. The others are TODO
skeletons for students — uncomment/extend them as you build each resource.
"""

from app.models.customer import Customer
from app.models.user import User

from app.models.contact import Contact  # TODO (exercise)
# from app.models.lead import Lead         # TODO (exercise)
# from app.models.deal import Deal         # TODO (exercise)
# from app.models.task import Task         # TODO (exercise)

__all__ = ["Customer", "User", "Contact"]

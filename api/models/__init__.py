# Import every model module so Django registers all models as soon as the
# `api` app loads, no matter which view/admin module happens to be imported
# first. Without this, `makemigrations` can silently miss a model that nothing
# has imported yet. Order follows the dependency chain.
from api.models import enums  # noqa: F401
from api.models import schedule  # noqa: F401
from api.models import ballkid  # noqa: F401
from api.models import rating  # noqa: F401
from api.models import application  # noqa: F401
from api.models import shift_group  # noqa: F401
from api.models import captain_rating  # noqa: F401
from api.models import trivia  # noqa: F401
from api.models import notifications  # noqa: F401
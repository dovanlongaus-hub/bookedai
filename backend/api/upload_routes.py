from fastapi import APIRouter, status

from api import route_handlers as handlers


router = APIRouter(prefix="/api")

router.add_api_route(
    "/uploads/images",
    handlers.upload_image,
    methods=["POST"],
    status_code=status.HTTP_201_CREATED,
)
router.add_api_route(
    "/uploads/files",
    handlers.upload_file,
    methods=["POST"],
    status_code=status.HTTP_201_CREATED,
)

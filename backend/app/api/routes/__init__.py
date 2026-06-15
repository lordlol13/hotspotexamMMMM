from fastapi import APIRouter
from app.api.routes.auth import router as auth_router
from app.api.routes.slides import router as slides_router
from app.api.routes.regions import router as regions_router
from app.api.routes.exams import router as exams_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.groups import router as groups_router
from app.api.routes.students import router as students_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(slides_router, prefix="/slides", tags=["Slides / Microscopy"])
api_router.include_router(regions_router, prefix="/regions", tags=["Slide Regions / Hotspots"])
api_router.include_router(exams_router, prefix="/exams", tags=["Exam Engine"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Power BI Analytics"])
api_router.include_router(groups_router, prefix="/groups", tags=["Groups"])
api_router.include_router(students_router, prefix="/students", tags=["Students"])

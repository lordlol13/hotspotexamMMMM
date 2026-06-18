import os
import math
from typing import Optional
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
import logging

try:
    import openslide
    from openslide.deepzoom import DeepZoomGenerator
    OPENSLIDE_AVAILABLE = True
except ImportError:
    OPENSLIDE_AVAILABLE = False
    DeepZoomGenerator = None
    openslide = None

logger = logging.getLogger("app.utils.svs_processor")

class PillowDeepZoomGenerator:
    def __init__(self, image: Image.Image, tile_size: int = 256, overlap: int = 1):
        self.image = image
        self.tile_size = tile_size
        self.overlap = overlap

        self.width, self.height = image.size
        max_dim = max(self.width, self.height)

        self.level_count = int(math.ceil(math.log2(max_dim))) + 1

        self.level_dimensions = []
        for level in range(self.level_count):
            scale = 2 ** (level - (self.level_count - 1))
            w = max(1, int(round(self.width * scale)))
            h = max(1, int(round(self.height * scale)))
            self.level_dimensions.append((w, h))

    def get_tile_count(self, level: int) -> tuple[int, int]:
        w, h = self.level_dimensions[level]
        cols = int(math.ceil(w / self.tile_size))
        rows = int(math.ceil(h / self.tile_size))
        return cols, rows

    def get_tile(self, level: int, address: tuple[int, int]) -> Image.Image:
        col, row = address
        w, h = self.level_dimensions[level]
        cols, rows = self.get_tile_count(level)

        x = col * self.tile_size - (self.overlap if col > 0 else 0)
        y = row * self.tile_size - (self.overlap if row > 0 else 0)

        tile_w = self.tile_size + (self.overlap if col > 0 else 0) + (self.overlap if col < cols - 1 else 0)
        tile_h = self.tile_size + (self.overlap if row > 0 else 0) + (self.overlap if row < rows - 1 else 0)

        tile_w = min(tile_w, w - x)
        tile_h = min(tile_h, h - y)

        scale = 2 ** (level - (self.level_count - 1))
        orig_x = int(round(x / scale))
        orig_y = int(round(y / scale))
        orig_w = int(round(tile_w / scale))
        orig_h = int(round(tile_h / scale))

        box = (
            orig_x,
            orig_y,
            min(self.width, orig_x + orig_w),
            min(self.height, orig_y + orig_h)
        )

        cropped = self.image.crop(box)

        if cropped.size != (tile_w, tile_h) and tile_w > 0 and tile_h > 0:
            cropped = cropped.resize((tile_w, tile_h), Image.Resampling.LANCZOS)

        return cropped

class UnifiedSlideProcessor:
    def __init__(self, file_path: str, tile_size: int = 256, overlap: int = 1):
        self.file_path = file_path
        self.tile_size = tile_size
        self.overlap = overlap

        self.ext = os.path.splitext(file_path)[1].lower()
        self.is_openslide_format = self.ext in [".svs", ".tiff", ".tif", ".ndpi", ".vms", ".bif", ".mrxs"]

        self.slide = None
        self.pil_image = None
        self.dz = None

        self._init_reader()

    def _init_reader(self):

        if self.is_openslide_format and OPENSLIDE_AVAILABLE:
            try:
                self.slide = openslide.OpenSlide(self.file_path)
                self.dz = DeepZoomGenerator(self.slide, tile_size=self.tile_size, overlap=self.overlap, limit_bounds=False)
                return
            except Exception as e:
                logger.warning(f"OpenSlide failed to load {self.file_path}, falling back to PIL: {e}")

        self.pil_image = Image.open(self.file_path)

        if self.pil_image.mode not in ["RGB", "RGBA"]:
            self.pil_image = self.pil_image.convert("RGB")
        self.dz = PillowDeepZoomGenerator(self.pil_image, tile_size=self.tile_size, overlap=self.overlap)

    @property
    def width(self) -> int:
        if self.slide:
            return self.slide.dimensions[0]
        return self.pil_image.size[0]

    @property
    def height(self) -> int:
        if self.slide:
            return self.slide.dimensions[1]
        return self.pil_image.size[1]

    @property
    def mpp(self) -> Optional[float]:
        if self.slide:

            mpp_x = self.slide.properties.get(openslide.PROPERTY_NAME_MPP_X)
            if mpp_x:
                return float(mpp_x)
        return None

    @property
    def objective_power(self) -> Optional[float]:
        if self.slide:
            mag = self.slide.properties.get(openslide.PROPERTY_NAME_OBJECTIVE_POWER)
            if mag:
                return float(mag)
        return None

    def get_dzi_xml(self) -> str:
        return f"""<?xml version="1.0" encoding="utf-8"?>
<Image xmlns="http://schemas.microsoft.com/deepzoom/2008"
       TileSize="{self.tile_size}"
       Overlap="{self.overlap}"
       Format="jpeg">
  <Size Width="{self.width}" Height="{self.height}"/>
</Image>"""

    def get_tile(self, level: int, col: int, row: int) -> Image.Image:
        return self.dz.get_tile(level, (col, row))

    def generate_thumbnail(self, max_width: int = 1024) -> Image.Image:
        if self.slide:

            aspect = self.width / self.height
            h = int(max_width / aspect)
            return self.slide.get_thumbnail((max_width, h))
        else:

            thumb = self.pil_image.copy()
            thumb.thumbnail((max_width, max_width), Image.Resampling.LANCZOS)
            return thumb

    def close(self):
        if self.slide:
            self.slide.close()
        if self.pil_image:
            self.pil_image.close()

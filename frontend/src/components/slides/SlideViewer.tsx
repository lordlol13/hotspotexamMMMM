import React, { useEffect, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";
import { Box, CircularProgress, Typography, IconButton, Paper, Tooltip } from "@mui/material";
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  Home as HomeIcon
} from "@mui/icons-material";
import axios from "axios";
import DrawingOverlay from "./DrawingOverlay";

function getAuthToken(): string | null {
  return localStorage.getItem("access_token");
}

interface SlideViewerProps {
  slideId: string;
  highlightRegion?: {
    region_type: string;
    geometry: any;
  };
  isTeacher?: boolean;
  onImageClick?: (point: { x: number; y: number }) => void;
  selectedPoint?: { x: number; y: number } | null;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({
  slideId,
  highlightRegion,
  isTeacher = false,
  onImageClick,
  selectedPoint
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ width: number; height: number; title: string } | null>(null);
  const osdViewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [viewerInstance, setViewerInstance] = useState<OpenSeadragon.Viewer | null>(null);

  useEffect(() => {
    let active = true;
    let retryCount = 0;
    const maxRetries = 10;
    const retryDelay = 2000;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const fetchMetadata = () => {
      if (!active) return;
      setLoading(true);
      setError(null);

      axios.get(`/api/v1/slides/${slideId}`)
        .then(res => {
          if (!active) return;
          const data = res.data;

          if (!data.is_processed && retryCount < maxRetries) {
            retryCount++;
            timerId = setTimeout(fetchMetadata, retryDelay);
            return;
          }

          setMetadata({
            width: data.width || 1,
            height: data.height || 1,
            title: data.title || "Препарат"
          });
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setError("Ошибка загрузки метаданных препарата");
          setLoading(false);
        });
    };

    fetchMetadata();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [slideId]);

  useEffect(() => {
    if (loading || error || !metadata || !viewerRef.current) return;

    if (osdViewerRef.current) {
      osdViewerRef.current.destroy();
      osdViewerRef.current = null;
    }

    const token = getAuthToken();

    const tileSource = {
      width: metadata.width,
      height: metadata.height,
      tileSize: 256,
      tileOverlap: 1,
      minLevel: 0,
      maxLevel: Math.ceil(Math.log2(Math.max(metadata.width, metadata.height))),
      getTileUrl: function (level: number, x: number, y: number) {
        const baseUrl = axios.defaults.baseURL || "";
        return `${baseUrl}/api/v1/slides/${slideId}/tiles/${level}/${x}_${y}.jpeg`;
      }
    };

    const viewer = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
      tileSources: tileSource,
      showNavigationControl: false,
      showNavigator: true,
      navigatorPosition: "BOTTOM_RIGHT",
      navigatorSizeRatio: 0.18,
      wrapHorizontal: false,
      wrapVertical: false,
      visibilityRatio: 0.5,
      minZoomLevel: 0.5,
      maxZoomLevel: 40,
      defaultZoomLevel: 1,
      animationTime: 0.4,
      blendTime: 0.1,
      gestureSettingsMouse: {
        clickToZoom: !onImageClick
      },
      gestureSettingsTouch: {
        clickToZoom: !onImageClick
      },

      loadTilesWithAjax: true,
      ajaxHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      tileRetryMax: 3,
      tileRetryDelay: 1000,
    } as any);

    osdViewerRef.current = viewer;
    setViewerInstance(viewer);

    let refreshingTiles = false;
    viewer.addHandler("tile-load-failed", async () => {
      if (refreshingTiles) return;
      refreshingTiles = true;
      try {
        await axios.get(`/api/v1/slides/${slideId}`);
        const refreshedToken = getAuthToken();
        (viewer as any).setAjaxHeaders(
          refreshedToken ? { Authorization: `Bearer ${refreshedToken}` } : {},
          true,
        );
        viewer.forceRedraw();
      } finally {
        refreshingTiles = false;
      }
    });

    return () => {
      if (osdViewerRef.current) {
        osdViewerRef.current.destroy();
        osdViewerRef.current = null;
        setViewerInstance(null);
      }
    };
  }, [loading, error, metadata, slideId]);

  useEffect(() => {
    if (!viewerInstance || !onImageClick || !metadata) return;

    const clickHandler = (event: any) => {
      if (!event.quick) return;
      const webPoint = event.position;
      const viewportPoint = viewerInstance.viewport.pointFromPixel(webPoint);
      const imagePoint = viewerInstance.viewport.viewportToImageCoordinates(viewportPoint);
      const percentX = (imagePoint.x / metadata.width) * 100;
      const percentY = (imagePoint.y / metadata.height) * 100;
      onImageClick({ x: percentX, y: percentY });
    };

    viewerInstance.addHandler("canvas-click", clickHandler);
    return () => {
      viewerInstance.removeHandler("canvas-click", clickHandler);
    };
  }, [viewerInstance, onImageClick, metadata]);

  useEffect(() => {
    if (!viewerInstance) return;
    const v = viewerInstance as any;
    if (v.gestureSettingsMouse && v.gestureSettingsTouch) {
      v.gestureSettingsMouse.clickToZoom = !onImageClick;
      v.gestureSettingsTouch.clickToZoom = !onImageClick;
    }
  }, [viewerInstance, onImageClick]);

  const handleZoomIn = () => {
    if (osdViewerRef.current) {
      const currentZoom = osdViewerRef.current.viewport.getZoom();
      osdViewerRef.current.viewport.zoomTo(currentZoom * 1.35);
    }
  };

  const handleZoomOut = () => {
    if (osdViewerRef.current) {
      const currentZoom = osdViewerRef.current.viewport.getZoom();
      osdViewerRef.current.viewport.zoomTo(currentZoom / 1.35);
    }
  };

  const handleGoHome = () => {
    if (osdViewerRef.current) {
      osdViewerRef.current.viewport.goHome();
    }
  };

  const handleToggleFullscreen = () => {
    if (osdViewerRef.current) {
      const v = osdViewerRef.current as any;
      v.setFullScreen(!v.isFullScreen());
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" bgcolor="#f8fafc">
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
          Загрузка микроскопического препарата...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%" bgcolor="#f8fafc">
        <Typography color="error" variant="body1">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box position="relative" width="100%" height="100%" bgcolor="#ffffff" overflow="hidden">
      <div
        ref={viewerRef}
        style={{ width: "100%", height: "100%", backgroundColor: "#f8fafc" }}
      />

      {metadata && (
        <DrawingOverlay
          slideId={slideId}
          viewer={viewerInstance}
          slideWidth={metadata.width}
          slideHeight={metadata.height}
          isTeacher={isTeacher}
          highlightRegion={highlightRegion}
          selectedPoint={selectedPoint}
        />
      )}

      <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 100, pointerEvents: "none" }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.8,
            bgcolor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
            {metadata?.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.2 }}>
            {metadata?.width.toLocaleString()} × {metadata?.height.toLocaleString()} px
          </Typography>
        </Paper>
      </Box>

      <Box position="absolute" bottom={16} left="50%" sx={{ transform: "translateX(-50%)", zIndex: 100 }}>
        <Paper
          elevation={0}
          sx={{
            p: 0.6,
            display: "flex",
            gap: 0.6,
            bgcolor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
            borderRadius: "30px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
          }}
        >
          <Tooltip title="Увеличить">
            <IconButton onClick={handleZoomIn} size="small" sx={{ color: "#0040b0" }}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Уменьшить">
            <IconButton onClick={handleZoomOut} size="small" sx={{ color: "#0040b0" }}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Сбросить масштаб">
            <IconButton onClick={handleGoHome} size="small" sx={{ color: "#0040b0" }}>
              <HomeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Во весь экран">
            <IconButton onClick={handleToggleFullscreen} size="small" sx={{ color: "#0040b0" }}>
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
        </Paper>
      </Box>
    </Box>
  );
};

export default SlideViewer;

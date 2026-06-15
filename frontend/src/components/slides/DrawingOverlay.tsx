import React, { useState, useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";
import { Box, Paper, ToggleButtonGroup, ToggleButton, Tooltip, IconButton, Button } from "@mui/material";
import Crop54Icon from "@mui/icons-material/Crop54";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import PolylineIcon from "@mui/icons-material/Polyline";
import GestureIcon from "@mui/icons-material/Gesture";
import EditOffIcon from "@mui/icons-material/EditOff";
import CloseIcon from "@mui/icons-material/Close";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import RegionEditor, { RegionShapeType, RegionContentType } from "./RegionEditor";
import QuizIcon from "@mui/icons-material/Quiz";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import InfoIcon from "@mui/icons-material/Info";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import LinkIcon from "@mui/icons-material/Link";
import axios from "axios";

interface DrawingOverlayProps {
  slideId: string;
  viewer: OpenSeadragon.Viewer | null;
  slideWidth: number;
  slideHeight: number;
  isTeacher: boolean;
  highlightRegion?: {
    region_type: string;
    geometry: any;
  };
  selectedPoint?: { x: number; y: number } | null;
}

export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  slideId,
  viewer,
  slideWidth,
  slideHeight,
  isTeacher,
  highlightRegion,
  selectedPoint
}) => {
  const [drawMode, setDrawMode] = useState<RegionShapeType | "view">("view");
  const [regions, setRegions] = useState<any[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);

  const [scaledRegions, setScaledRegions] = useState<any[]>([]);
  const [activeDrawingShape, setActiveDrawingShape] = useState<any | null>(null);
  const [scaledSelectedPoint, setScaledSelectedPoint] = useState<{ x: number; y: number } | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [lastGeometry, setLastGeometry] = useState<any>(null);
  const [contentType, setContentType] = useState<RegionContentType>("explanation");

  const svgRef = useRef<SVGSVGElement>(null);

  const fetchRegions = () => {
    if (highlightRegion || !isTeacher) {
      setRegions([]);
      return;
    }
    axios.get(`/api/v1/regions/slide/${slideId}`)
      .then(res => {
        setRegions(res.data);
      })
      .catch(err => console.error("Failed to load slide regions:", err));
  };

  useEffect(() => {
    fetchRegions();
  }, [slideId, highlightRegion, isTeacher]);

  const updateScaledRegions = () => {
    if (!viewer) {
      setScaledRegions([]);
      setScaledSelectedPoint(null);
      return;
    }

    if (selectedPoint) {
      const imgX = (selectedPoint.x / 100) * slideWidth;
      const imgY = (selectedPoint.y / 100) * slideHeight;
      const screenPt = viewer.viewport.viewportToViewerElementCoordinates(
        viewer.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(imgX, imgY))
      );
      setScaledSelectedPoint({ x: screenPt.x, y: screenPt.y });
    } else {
      setScaledSelectedPoint(null);
    }

    const items = highlightRegion
      ? [{
          id: "highlight-region",
          title: "Область вопроса",
          region_type: highlightRegion.region_type,
          geometry: highlightRegion.geometry,
          content_type: "explanation"
        }]
      : regions;

    if (!items.length) {
      setScaledRegions([]);
      return;
    }

    const scaled = items.map(region => {
      const geom = region.geometry;
      let scaledGeom: any = {};

      if (region.region_type === "rectangle") {

        const imgX = (geom.x / 100) * slideWidth;
        const imgY = (geom.y / 100) * slideHeight;
        const imgW = (geom.w / 100) * slideWidth;
        const imgH = (geom.h / 100) * slideHeight;

        const screenPt1 = viewer.viewport.viewportToViewerElementCoordinates(
          viewer.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(imgX, imgY))
        );
        const screenPt2 = viewer.viewport.viewportToViewerElementCoordinates(
          viewer.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(imgX + imgW, imgY + imgH))
        );

        scaledGeom = {
          x: screenPt1.x,
          y: screenPt1.y,
          w: screenPt2.x - screenPt1.x,
          h: screenPt2.y - screenPt1.y
        };
      } else if (region.region_type === "circle") {
        const imgCX = (geom.cx / 100) * slideWidth;
        const imgCY = (geom.cy / 100) * slideHeight;
        const imgR = (geom.r / 100) * slideWidth;

        const screenPtCenter = viewer.viewport.viewportToViewerElementCoordinates(
          viewer.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(imgCX, imgCY))
        );
        const screenPtEdge = viewer.viewport.viewportToViewerElementCoordinates(
          viewer.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(imgCX + imgR, imgCY))
        );

        scaledGeom = {
          cx: screenPtCenter.x,
          cy: screenPtCenter.y,
          r: screenPtEdge.x - screenPtCenter.x
        };
      } else if (region.region_type === "polygon" || region.region_type === "freehand") {
        const screenPoints = geom.points.map((pt: number[]) => {
          const imgX = (pt[0] / 100) * slideWidth;
          const imgY = (pt[1] / 100) * slideHeight;
          const viewportPt = viewer.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(imgX, imgY));
          const screenPt = viewer.viewport.viewportToViewerElementCoordinates(viewportPt);
          return [screenPt.x, screenPt.y];
        });
        scaledGeom = { points: screenPoints };
      } else if (region.region_type === "line" || region.region_type === "arrow") {
        const imgX1 = (geom.x1 / 100) * slideWidth;
        const imgY1 = (geom.y1 / 100) * slideHeight;
        const imgX2 = (geom.x2 / 100) * slideWidth;
        const imgY2 = (geom.y2 / 100) * slideHeight;

        const screenPt1 = viewer.viewport.viewportToViewerElementCoordinates(
          viewer.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(imgX1, imgY1))
        );
        const screenPt2 = viewer.viewport.viewportToViewerElementCoordinates(
          viewer.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(imgX2, imgY2))
        );

        scaledGeom = {
          x1: screenPt1.x,
          y1: screenPt1.y,
          x2: screenPt2.x,
          y2: screenPt2.y
        };
      } else if (region.region_type === "text") {
        const imgX = (geom.x / 100) * slideWidth;
        const imgY = (geom.y / 100) * slideHeight;

        const screenPt = viewer.viewport.viewportToViewerElementCoordinates(
          viewer.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(imgX, imgY))
        );

        scaledGeom = {
          x: screenPt.x,
          y: screenPt.y
        };
      }

      return {
        ...region,
        scaledGeom
      };
    });

    setScaledRegions(scaled);
  };

  useEffect(() => {
    if (!viewer) return;

    updateScaledRegions();

    viewer.addHandler("animation", updateScaledRegions);
    viewer.addHandler("canvas-drag", updateScaledRegions);
    viewer.addHandler("canvas-scroll", updateScaledRegions);
    viewer.addHandler("resize", updateScaledRegions);

    return () => {
      viewer.removeHandler("animation", updateScaledRegions);
      viewer.removeHandler("canvas-drag", updateScaledRegions);
      viewer.removeHandler("canvas-scroll", updateScaledRegions);
      viewer.removeHandler("resize", updateScaledRegions);
    };
  }, [viewer, regions, highlightRegion, slideWidth, slideHeight, selectedPoint]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (drawMode === "view" || !viewer || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawMode === "text") {
      const viewportPt = viewer.viewport.viewerElementToViewportCoordinates(new OpenSeadragon.Point(x, y));
      const imgPt = viewer.viewport.viewportToImageCoordinates(viewportPt);
      const geom = {
        x: (imgPt.x / slideWidth) * 100,
        y: (imgPt.y / slideHeight) * 100
      };
      setLastGeometry(geom);
      setEditorOpen(true);
      return;
    }

    if (drawMode === "polygon") {
      if (!isDrawing) {
        setIsDrawing(true);
        setStartPoint({ x, y });
        setCurrentPoints([{ x, y }]);
      } else {

        if (startPoint) {
          const dist = Math.sqrt((x - startPoint.x) ** 2 + (y - startPoint.y) ** 2);
          if (dist < 15 && currentPoints.length >= 3) {

            finishPolygon();
            return;
          }
        }

        setCurrentPoints((prev) => [...prev, { x, y }]);
      }
      return;
    }

    setIsDrawing(true);
    setStartPoint({ x, y });

    if (drawMode === "freehand") {
      setCurrentPoints([{ x, y }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !startPoint || !viewer || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawMode === "rectangle") {
      setActiveDrawingShape({
        type: "rectangle",
        x: Math.min(startPoint.x, x),
        y: Math.min(startPoint.y, y),
        w: Math.abs(startPoint.x - x),
        h: Math.abs(startPoint.y - y)
      });
    } else if (drawMode === "circle") {
      const dx = startPoint.x - x;
      const dy = startPoint.y - y;
      const r = Math.sqrt(dx * dx + dy * dy);
      setActiveDrawingShape({
        type: "circle",
        cx: startPoint.x,
        cy: startPoint.y,
        r
      });
    } else if (drawMode === "freehand") {
      setCurrentPoints([...currentPoints, { x, y }]);
      setActiveDrawingShape({
        type: "freehand",
        points: [...currentPoints, { x, y }]
      });
    } else if (drawMode === "polygon") {

      setActiveDrawingShape({
        type: "polygon",
        points: [...currentPoints, { x, y }]
      });
    } else if (drawMode === "line") {
      setActiveDrawingShape({
        type: "line",
        x1: startPoint.x,
        y1: startPoint.y,
        x2: x,
        y2: y
      });
    } else if (drawMode === "arrow") {
      setActiveDrawingShape({
        type: "arrow",
        x1: startPoint.x,
        y1: startPoint.y,
        x2: x,
        y2: y
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !startPoint || !viewer || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawMode === "polygon") {

      return;
    }

    setIsDrawing(false);
    setActiveDrawingShape(null);

    if (drawMode !== "view") {
      const finalGeom = calculatePercentageGeometry(drawMode, startPoint, x, y, currentPoints);
      setLastGeometry(finalGeom);
      setEditorOpen(true);
    }
  };

  const finishPolygon = () => {

    let pts = [...currentPoints];
    while (pts.length > 1) {
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const dist = Math.sqrt((last.x - prev.x) ** 2 + (last.y - prev.y) ** 2);
      if (dist < 10) {
        pts.pop();
      } else {
        break;
      }
    }

    if (pts.length < 3) {
      setIsDrawing(false);
      setCurrentPoints([]);
      setActiveDrawingShape(null);
      return;
    }

    setIsDrawing(false);
    setActiveDrawingShape(null);
    const finalGeom = calculatePercentageGeometry("polygon", null, 0, 0, pts);
    setLastGeometry(finalGeom);
    setEditorOpen(true);
    setCurrentPoints([]);
  };

  const handleDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (drawMode === "polygon" && isDrawing) {
      e.stopPropagation();
      finishPolygon();
    }
  };

  const calculatePercentageGeometry = (
    mode: RegionShapeType,
    start: { x: number; y: number } | null,
    endX: number,
    endY: number,
    points: { x: number; y: number }[]
  ) => {
    if (!viewer) return null;

    if (mode === "rectangle" && start) {

      const pX = Math.min(start.x, endX);
      const pY = Math.min(start.y, endY);
      const pW = Math.abs(start.x - endX);
      const pH = Math.abs(start.y - endY);

      const imgPt1 = viewer.viewport.viewportToImageCoordinates(
        viewer.viewport.viewerElementToViewportCoordinates(new OpenSeadragon.Point(pX, pY))
      );
      const imgPt2 = viewer.viewport.viewportToImageCoordinates(
        viewer.viewport.viewerElementToViewportCoordinates(new OpenSeadragon.Point(pX + pW, pY + pH))
      );

      return {
        x: (imgPt1.x / slideWidth) * 100,
        y: (imgPt1.y / slideHeight) * 100,
        w: ((imgPt2.x - imgPt1.x) / slideWidth) * 100,
        h: ((imgPt2.y - imgPt1.y) / slideHeight) * 100
      };
    } else if (mode === "circle" && start) {
      const radiusPx = Math.sqrt((start.x - endX) ** 2 + (start.y - endY) ** 2);

      const imgPtCenter = viewer.viewport.viewportToImageCoordinates(
        viewer.viewport.viewerElementToViewportCoordinates(new OpenSeadragon.Point(start.x, start.y))
      );
      const imgPtEdge = viewer.viewport.viewportToImageCoordinates(
        viewer.viewport.viewerElementToViewportCoordinates(new OpenSeadragon.Point(start.x + radiusPx, start.y))
      );

      return {
        cx: (imgPtCenter.x / slideWidth) * 100,
        cy: (imgPtCenter.y / slideHeight) * 100,
        r: ((imgPtEdge.x - imgPtCenter.x) / slideWidth) * 100
      };
    } else if (mode === "polygon" || mode === "freehand") {
      const percentagePoints = points.map(pt => {
        const viewportPt = viewer.viewport.viewerElementToViewportCoordinates(new OpenSeadragon.Point(pt.x, pt.y));
        const imgPt = viewer.viewport.viewportToImageCoordinates(viewportPt);
        return [
          (imgPt.x / slideWidth) * 100,
          (imgPt.y / slideHeight) * 100
        ];
      });

      return {
        points: percentagePoints
      };
    } else if ((mode === "line" || mode === "arrow") && start) {
      const imgPt1 = viewer.viewport.viewportToImageCoordinates(
        viewer.viewport.viewerElementToViewportCoordinates(new OpenSeadragon.Point(start.x, start.y))
      );
      const imgPt2 = viewer.viewport.viewportToImageCoordinates(
        viewer.viewport.viewerElementToViewportCoordinates(new OpenSeadragon.Point(endX, endY))
      );

      return {
        x1: (imgPt1.x / slideWidth) * 100,
        y1: (imgPt1.y / slideHeight) * 100,
        x2: (imgPt2.x / slideWidth) * 100,
        y2: (imgPt2.y / slideHeight) * 100
      };
    }

    return null;
  };

  const handleSaveRegion = (newRegion: any) => {
    setRegions([...regions, newRegion]);
    setDrawMode("view");
  };

  const handleDeleteRegion = (regionId: string) => {
    axios.delete(`/api/v1/regions/${regionId}`)
      .then(() => {
        setRegions(regions.filter(r => r.id !== regionId));
      })
      .catch(err => console.error("Failed to delete region:", err));
  };

  return (
    <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10, pointerEvents: "none" }}>
      {}
      {isTeacher && (
        <Box sx={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 100, pointerEvents: "auto" }}>
          <Paper
            elevation={3}
            sx={{
              p: 0.5,
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              display: "flex",
              gap: 0.5
            }}
          >
            <ToggleButtonGroup
              value={drawMode}
              exclusive
              onChange={(_, value) => {
                if (value) {
                  setDrawMode(value);
                  setIsDrawing(false);
                  setCurrentPoints([]);
                  setActiveDrawingShape(null);
                }
              }}
              size="small"
              color="primary"
              sx={{
                "& .MuiToggleButton-root": {
                  border: "none",
                  borderRadius: "6px",
                  color: "#64748b",
                  "&.Mui-selected": {
                    bgcolor: "rgba(0,64,176,0.08)",
                    color: "#0040b0",
                    "&:hover": {
                      bgcolor: "rgba(0,64,176,0.12)",
                    }
                  }
                }
              }}
            >
              <ToggleButton value="view">
                <Tooltip title="Просмотр (клик для деталей)">
                  <EditOffIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="rectangle">
                <Tooltip title="Прямоугольник">
                  <Crop54Icon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="circle">
                <Tooltip title="Круг">
                  <RadioButtonUncheckedIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="polygon">
                <Tooltip title="Многоугольник">
                  <PolylineIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="freehand">
                <Tooltip title="Произвольная область">
                  <GestureIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="line">
                <Tooltip title="Линия (полоска)">
                  <HorizontalRuleIcon sx={{ transform: "rotate(-45deg)" }} />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="arrow">
                <Tooltip title="Стрелка">
                  <ArrowRightAltIcon sx={{ transform: "rotate(-45deg)" }} />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="text">
                <Tooltip title="Текст (комментарий)">
                  <TextFieldsIcon />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            {drawMode === "polygon" && isDrawing && (
              <Button size="small" variant="contained" color="success" onClick={finishPolygon} sx={{ ml: 1, borderRadius: "6px" }}>
                Готово
              </Button>
            )}
          </Paper>
        </Box>
      )}

      {}
      {isTeacher && (
        <Box sx={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", zIndex: 100, pointerEvents: "auto" }}>
          <Paper
            elevation={3}
            sx={{
              p: 0.5,
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: 0.5
            }}
          >
            <ToggleButtonGroup
              orientation="vertical"
              value={contentType}
              exclusive
              onChange={(_, value) => {
                if (value) {
                  setContentType(value);
                }
              }}
              size="small"
              color="primary"
              sx={{
                "& .MuiToggleButton-root": {
                  border: "none",
                  borderRadius: "6px",
                  color: "#64748b",
                  padding: "8px",
                  "&.Mui-selected": {
                    bgcolor: "rgba(0,64,176,0.08)",
                    color: "#0040b0",
                    "&:hover": {
                      bgcolor: "rgba(0,64,176,0.12)",
                    }
                  }
                }
              }}
            >
              <ToggleButton value="question">
                <Tooltip title="Вопрос (выбор ответа)" placement="left">
                  <QuizIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="question_point">
                <Tooltip title="Вопрос (указать на фото)" placement="left">
                  <TouchAppIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="explanation">
                <Tooltip title="Пояснение (аннотация)" placement="left">
                  <InfoIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="youtube">
                <Tooltip title="Видео YouTube" placement="left">
                  <PlayCircleIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="audio">
                <Tooltip title="Аудиогид" placement="left">
                  <VolumeUpIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="pdf">
                <Tooltip title="Документ PDF" placement="left">
                  <PictureAsPdfIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="link">
                <Tooltip title="Внешняя ссылка" placement="left">
                  <LinkIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Box>
      )}

      {}
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: drawMode === "view" ? "none" : "auto",
          cursor: drawMode === "view" ? "default" : "crosshair"
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#00695c" />
          </marker>
          <marker
            id="arrowhead-preview"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#ff8f00" />
          </marker>
        </defs>

        {}
        {scaledRegions.map((region) => {
          const isView = drawMode === "view";
          return (
            <g
              key={region.id}
              style={{ pointerEvents: isView ? "auto" : "none", cursor: "pointer" }}
              onClick={() => {
                if (isView && !highlightRegion) {
                  alert(`Clicked Hotspot: ${region.title}\nContent Type: ${region.content_type}\nDescription: ${region.description}`);
                }
              }}
            >
              {region.region_type === "rectangle" && (
                <rect
                  x={region.scaledGeom.x}
                  y={region.scaledGeom.y}
                  width={region.scaledGeom.w}
                  height={region.scaledGeom.h}
                  fill="rgba(0, 105, 92, 0.15)"
                  stroke="#00695c"
                  strokeWidth="2.5"
                  className="hotspot-shape"
                />
              )}

              {region.region_type === "circle" && (
                <circle
                  cx={region.scaledGeom.cx}
                  cy={region.scaledGeom.cy}
                  r={region.scaledGeom.r}
                  fill="rgba(0, 105, 92, 0.15)"
                  stroke="#00695c"
                  strokeWidth="2.5"
                  className="hotspot-shape"
                />
              )}

              {(region.region_type === "polygon" || region.region_type === "freehand") && (
                <polygon
                  points={region.scaledGeom.points.map((p: number[]) => p.join(",")).join(" ")}
                  fill="rgba(0, 105, 92, 0.15)"
                  stroke="#00695c"
                  strokeWidth="2.5"
                  className="hotspot-shape"
                />
              )}

              {region.region_type === "line" && (
                <line
                  x1={region.scaledGeom.x1}
                  y1={region.scaledGeom.y1}
                  x2={region.scaledGeom.x2}
                  y2={region.scaledGeom.y2}
                  stroke="#00695c"
                  strokeWidth="3.5"
                  className="hotspot-shape"
                />
              )}

              {region.region_type === "arrow" && (
                <line
                  x1={region.scaledGeom.x1}
                  y1={region.scaledGeom.y1}
                  x2={region.scaledGeom.x2}
                  y2={region.scaledGeom.y2}
                  stroke="#00695c"
                  strokeWidth="3.5"
                  markerEnd="url(#arrowhead)"
                  className="hotspot-shape"
                />
              )}

              {region.region_type === "text" && (
                <g className="hotspot-shape">
                  <circle
                    cx={region.scaledGeom.x}
                    cy={region.scaledGeom.y}
                    r={6}
                    fill="#00695c"
                  />
                  <foreignObject
                    x={region.scaledGeom.x + 10}
                    y={region.scaledGeom.y - 12}
                    width="180"
                    height="60"
                    style={{ overflow: "visible", pointerEvents: "none" }}
                  >
                    <div style={{
                      backgroundColor: "rgba(15, 23, 42, 0.85)",
                      color: "#ffffff",
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #00695c",
                      display: "inline-block",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                      fontFamily: "sans-serif"
                    }}>
                      {region.title}
                    </div>
                  </foreignObject>
                </g>
              )}

              {}
              {isTeacher && isView && (
                <foreignObject
                  x={
                    region.region_type === "rectangle" ? region.scaledGeom.x + region.scaledGeom.w - 20 :
                    region.region_type === "circle" ? region.scaledGeom.cx + region.scaledGeom.r - 10 :
                    region.region_type === "line" || region.region_type === "arrow" ? region.scaledGeom.x2 - 10 :
                    region.region_type === "text" ? region.scaledGeom.x - 10 :
                    region.scaledGeom.points[0][0] - 10
                  }
                  y={
                    region.region_type === "rectangle" ? region.scaledGeom.y - 10 :
                    region.region_type === "circle" ? region.scaledGeom.cy - region.scaledGeom.r - 10 :
                    region.region_type === "line" || region.region_type === "arrow" ? region.scaledGeom.y2 - 10 :
                    region.region_type === "text" ? region.scaledGeom.y - 20 :
                    region.scaledGeom.points[0][1] - 10
                  }
                  width="30"
                  height="30"
                >
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete hotspot "${region.title}"?`)) {
                        handleDeleteRegion(region.id);
                      }
                    }}
                    sx={{
                      bgcolor: "background.paper",
                      color: "error.main",
                      boxShadow: 2,
                      p: 0.5,
                      "&:hover": { bgcolor: "error.dark", color: "#fff" }
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </foreignObject>
              )}
            </g>
          );
        })}

        {}
        {activeDrawingShape && (
          <g>
            {activeDrawingShape.type === "rectangle" && (
              <rect
                x={activeDrawingShape.x}
                y={activeDrawingShape.y}
                width={activeDrawingShape.w}
                height={activeDrawingShape.h}
                fill="rgba(255, 143, 0, 0.2)"
                stroke="#ff8f00"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            )}

            {activeDrawingShape.type === "circle" && (
              <circle
                cx={activeDrawingShape.cx}
                cy={activeDrawingShape.cy}
                r={activeDrawingShape.r}
                fill="rgba(255, 143, 0, 0.2)"
                stroke="#ff8f00"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            )}

            {activeDrawingShape.type === "freehand" && (
              <polygon
                points={activeDrawingShape.points.map((p: any) => `${p.x},${p.y}`).join(" ")}
                fill="rgba(255, 143, 0, 0.1)"
                stroke="#ff8f00"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            )}

            {activeDrawingShape.type === "polygon" && (
              <g>
                <polygon
                  points={activeDrawingShape.points.map((p: any) => `${p.x},${p.y}`).join(" ")}
                  fill="rgba(255, 143, 0, 0.1)"
                  stroke="#ff8f00"
                  strokeWidth="2"
                />
                {activeDrawingShape.points.map((p: any, idx: number) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill="#ff8f00"
                  />
                ))}
              </g>
            )}

            {activeDrawingShape.type === "line" && (
              <line
                x1={activeDrawingShape.x1}
                y1={activeDrawingShape.y1}
                x2={activeDrawingShape.x2}
                y2={activeDrawingShape.y2}
                stroke="#ff8f00"
                strokeWidth="3"
                strokeDasharray="4 4"
              />
            )}

            {activeDrawingShape.type === "arrow" && (
              <line
                x1={activeDrawingShape.x1}
                y1={activeDrawingShape.y1}
                x2={activeDrawingShape.x2}
                y2={activeDrawingShape.y2}
                stroke="#ff8f00"
                strokeWidth="3"
                strokeDasharray="4 4"
                markerEnd="url(#arrowhead-preview)"
              />
            )}
          </g>
        )}

        {}
        {scaledSelectedPoint && (
          <g>
            <circle
              cx={scaledSelectedPoint.x}
              cy={scaledSelectedPoint.y}
              r={12}
              fill="rgba(239, 68, 68, 0.25)"
              stroke="#ef4444"
              strokeWidth="2.5"
              style={{ pointerEvents: "none" }}
            />
            <circle
              cx={scaledSelectedPoint.x}
              cy={scaledSelectedPoint.y}
              r={3}
              fill="#ef4444"
              style={{ pointerEvents: "none" }}
            />
          </g>
        )}
      </svg>

      {}
      <RegionEditor
        open={editorOpen}
        slideId={slideId}
        shapeType={drawMode === "view" ? "rectangle" : drawMode}
        geometry={lastGeometry}
        contentType={contentType}
        onClose={() => {
          setEditorOpen(false);
          setDrawMode("view");
        }}
        onSave={handleSaveRegion}
      />
    </Box>
  );
};
export default DrawingOverlay;

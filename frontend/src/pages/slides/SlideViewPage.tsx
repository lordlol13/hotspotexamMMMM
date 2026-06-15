import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, AppBar, Toolbar, Typography, IconButton } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import SlideViewer from "../../components/slides/SlideViewer";
import { useAuth } from "../../App";

export const SlideViewPage: React.FC = () => {
  const { slideId } = useParams<{ slideId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  if (!slideId) {
    return (
      <Box p={3} bgcolor="#f8fafc">
        <Typography color="error">Слайд не найден.</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" width="100vw" height="100vh" bgcolor="#f8fafc">
      {}
      <AppBar position="static" sx={{ bgcolor: "#ffffff", borderBottom: "1px solid #e2e8f0" }} elevation={0}>
        <Toolbar variant="dense" sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center">
            <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} sx={{ mr: 2, color: "#0f172a" }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
              Просмотр препарата
            </Typography>
          </Box>
          <Button variant="outlined" size="small" onClick={() => navigate(-1)}>
            Назад к курсу
          </Button>
        </Toolbar>
      </AppBar>

      {}
      <Box flexGrow={1} position="relative">
        <SlideViewer slideId={slideId} isTeacher={isTeacher} />
      </Box>
    </Box>
  );
};

export default SlideViewPage;

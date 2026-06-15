import React, { useEffect, useState } from "react";
import { Box, Typography, Button, CircularProgress, Paper } from "@mui/material";
import axios from "axios";
import { CheckCircle as CheckCircleIcon, Error as ErrorIcon } from "@mui/icons-material";

const VerifyEmailPage: React.FC<{ onGoToLogin: () => void }> = ({ onGoToLogin }) => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Не найден токен подтверждения.");
      return;
    }

    const verify = async () => {
      try {
        await axios.post("/api/v1/auth/verify-email", { token });
        setStatus("success");
        setMessage("Ваш email успешно подтвержден!");
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.detail || "Ошибка при подтверждении email.");
      }
    };

    verify();
  }, []);

  return (
    <Box sx={{ display: "flex", width: "100vw", height: "100vh", bgcolor: "#f8fafc", justifyContent: "center", alignItems: "center" }}>
      <Paper elevation={3} sx={{ p: 5, borderRadius: "16px", textAlign: "center", maxWidth: 400 }}>
        {status === "loading" && (
          <>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6">Проверка токена...</Typography>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 1, fontWeight: "bold", color: "#1e293b" }}>Успешно</Typography>
            <Typography variant="body1" sx={{ color: "#64748b", mb: 4 }}>
              {message}
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={() => {

                window.history.replaceState({}, document.title, "/");
                onGoToLogin();
              }}
              sx={{ py: 1.5, borderRadius: "8px", fontWeight: "bold" }}
            >
              Войти
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <ErrorIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 1, fontWeight: "bold", color: "#1e293b" }}>Ошибка</Typography>
            <Typography variant="body1" sx={{ color: "#64748b", mb: 4 }}>
              {message}
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                window.history.replaceState({}, document.title, "/");
                onGoToLogin();
              }}
              sx={{ py: 1.5, borderRadius: "8px", fontWeight: "bold" }}
            >
              На главную
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default VerifyEmailPage;

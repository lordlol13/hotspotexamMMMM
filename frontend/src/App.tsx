import React, { createContext, lazy, Suspense, useContext, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";
import { DataProvider } from "./contexts/DataContext";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { getAppTheme } from "./theme";
import {
  Box,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  Button,
  MenuItem,
  Avatar,
  TextField,
  Select,
  FormControl,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  Grid,
  Collapse,
  FormControlLabel,
  Switch,
  Snackbar,
} from "@mui/material";
import {
  DescriptionOutlined as DescriptionOutlinedIcon,
  ExitToApp as ExitToAppIcon,
  PeopleAltOutlined as PeopleAltOutlinedIcon,
  SchoolOutlined as SchoolOutlinedIcon,
  EmojiEventsOutlined as EmojiEventsOutlinedIcon,
  LockOutlined as LockOutlinedIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
  LightModeOutlined as LightModeOutlinedIcon,
  TranslateOutlined as TranslateOutlinedIcon,
} from "@mui/icons-material";
import axios from "axios";

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/refresh")) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const refreshRes = await axios.post("/api/v1/auth/refresh", { refresh_token: refreshToken });
          const data = refreshRes.data;
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);

          axios.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
          originalRequest.headers["Authorization"] = `Bearer ${data.access_token}`;

          return axios(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh interceptor failed:", refreshError);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          delete axios.defaults.headers.common["Authorization"];
          window.location.href = "/";
        }
      }
    }
    return Promise.reject(error);
  }
);

const SlideViewPage = lazy(() => import("./pages/slides/SlideViewPage"));
const StudentDashboard = lazy(() => import("./pages/dashboard/StudentDashboard"));
const TeacherDashboard = lazy(() => import("./pages/dashboard/TeacherDashboard"));
const ExamListPage = lazy(() => import("./pages/exams/ExamListPage"));
const ExamTakePage = lazy(() => import("./pages/exams/ExamTakePage"));
const GroupsPage = lazy(() => import("./pages/groups/GroupsPage"));
const StudentsPage = lazy(() => import("./pages/students/StudentsPage"));
const GradesPage = lazy(() => import("./pages/grades/GradesPage"));

export const LogoIcon: React.FC<{ color?: string; style?: React.CSSProperties }> = ({ color = "#0040b0", style }) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block", ...style }}
  >
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" />
    <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="12" r="2.2" fill={color} />
  </svg>
);

interface User {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  is_private?: boolean;
  hide_grades?: boolean;
  role: "student" | "teacher" | "admin";
  student_profile?: {
    student_code?: string;
    faculty?: string;
    course_name?: string;
    group_id?: string;
  } | null;
  teacher_profile?: {
    department?: string;
    title?: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, passwordText: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: any, role: "student" | "teacher") => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
  themeMode: "light" | "dark";
  setThemeMode: (mode: "light" | "dark") => void;
  language: "ru" | "en";
  setLanguage: (lang: "ru" | "en") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const LoginPage: React.FC<{ onSwitchToRegister: () => void }> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@hotspot.com");
  const [password, setPassword] = useState("admin12345");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Пожалуйста, заполните все поля.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await login(email, password);
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || "Не удалось войти в систему.");
    }
  };

  return (
    <Box sx={{ display: "flex", width: "100vw", height: "100vh", bgcolor: "#ffffff" }}>
      {}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: "50%",
          height: "100%",
          position: "relative",
          background: "linear-gradient(145deg, #003ba4 0%, #001f60 100%)",
          color: "#ffffff",
          flexDirection: "column",
          justifyContent: "space-between",
          p: 6,
          boxSizing: "border-box",
          backgroundImage: "url('https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=1000&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(0, 67, 180, 0.9) 0%, rgba(0, 31, 96, 0.95) 100%)",
            zIndex: 1,
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", zIndex: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "8px",
              bgcolor: "#ffffff",
              mr: 1.5,
            }}
          >
            <LogoIcon color="#0043a4" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
            Hotspot Exam
          </Typography>
        </Box>

        <Box sx={{ zIndex: 2, pr: 4, mb: 10 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.3,
              mb: 2,
              fontSize: "2.2rem",
            }}
          >
            Интерактивные экзамены по изображениям
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "1.05rem",
              lineHeight: 1.5,
            }}
          >
            Нажимайте на области изображения, отвечайте на вопросы и получайте мгновенную оценку.
          </Typography>
        </Box>

        <Box sx={{ zIndex: 2 }} />
      </Box>

      {}
      <Box
        sx={{
          width: { xs: "100%", md: "50%" },
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          p: 4,
          boxSizing: "border-box",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 380 }}>
          {}
          <Box
            sx={{
              display: "flex",
              bgcolor: "#f1f3f5",
              borderRadius: "30px",
              p: 0.5,
              mb: 5,
            }}
          >
            <Button
              fullWidth
              disabled={submitting}
              sx={{
                borderRadius: "30px",
                py: 1,
                bgcolor: "#ffffff",
                color: "#0f172a",
                fontWeight: 700,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                "&:hover": { bgcolor: "#ffffff" },
              }}
            >
              Вход
            </Button>
            <Button
              fullWidth
              disabled={submitting}
              onClick={onSwitchToRegister}
              sx={{
                borderRadius: "30px",
                py: 1,
                color: "#64748b",
                fontWeight: 600,
                "&:hover": { color: "#0f172a" },
              }}
            >
              Регистрация
            </Button>
          </Box>

          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {error}
              </Alert>
            )}

            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "#0f172a", mb: 1 }}
            >
              Email или Имя пользователя
            </Typography>
            <TextField
              fullWidth
              disabled={submitting}
              placeholder="example@mail.com"
              variant="outlined"
              size="small"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              sx={{ mb: 2.5 }}
            />

            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "#0f172a", mb: 1 }}
            >
              Пароль
            </Typography>
            <TextField
              fullWidth
              disabled={submitting}
              type="password"
              placeholder="••••••••"
              variant="outlined"
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 4 }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                bgcolor: "#0043a4",
                color: "#ffffff",
                py: 1.3,
                fontWeight: 700,
                borderRadius: "8px",
                "&:hover": { bgcolor: "#003390" },
                mb: 3,
              }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : "Войти"}
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", my: 3.5 }}>
              <Divider sx={{ flexGrow: 1 }} />
              <Typography variant="body2" sx={{ mx: 2, color: "#94a3b8" }}>
                или
              </Typography>
              <Divider sx={{ flexGrow: 1 }} />
            </Box>

            <Button
              fullWidth
              variant="outlined"
              disabled={submitting}
              startIcon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              }
              onClick={() => alert("Авторизация через Google отключена в демо-режиме деплоя.")}
              sx={{
                py: 1.3,
                fontWeight: 600,
                color: "#334155",
                borderColor: "#e2e8f0",
                borderRadius: "8px",
                "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
              }}
            >
              Войти через Google
            </Button>
          </form>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 4,
              color: "#64748b",
              fontFamily: "monospace",
            }}
          >
            Демо-админ: admin@hotspot.com / admin12345
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const RegisterPage: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [group, setGroup] = useState("Без группы");
  const [course, setCourse] = useState("—");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);

  useEffect(() => {
    const fetchPublicGroups = async () => {
      try {
        const res = await axios.get("/api/v1/groups/public");
        if (Array.isArray(res.data)) {
          setAvailableGroups(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch public groups:", err);
      }
    };
    fetchPublicGroups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !password) {
      setError("Пожалуйста, заполните Email, Имя и Пароль.");
      return;
    }
    if (password.length < 10) {
      setError("Пароль должен содержать не менее 10 символов.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const parts = name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || (role === "student" ? "Студент" : "Преподаватель");

    const payload = {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      details,
      course,
      group
    };

    const res = await register(payload, role);
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || "Не удалось зарегистрироваться.");
    }
  };

  return (
    <Box sx={{ display: "flex", width: "100vw", height: "100vh", bgcolor: "#ffffff" }}>
      {}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: "50%",
          height: "100%",
          position: "relative",
          background: "linear-gradient(145deg, #003ba4 0%, #001f60 100%)",
          color: "#ffffff",
          flexDirection: "column",
          justifyContent: "space-between",
          p: 6,
          boxSizing: "border-box",
          backgroundImage: "url('https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=1000&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(0, 67, 180, 0.9) 0%, rgba(0, 31, 96, 0.95) 100%)",
            zIndex: 1,
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", zIndex: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "8px",
              bgcolor: "#ffffff",
              mr: 1.5,
            }}
          >
            <LogoIcon color="#0043a4" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
            Hotspot Exam
          </Typography>
        </Box>

        <Box sx={{ zIndex: 2, pr: 4, mb: 10 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.3,
              mb: 2,
              fontSize: "2.2rem",
            }}
          >
            Интерактивные экзамены по изображениям
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "1.05rem",
              lineHeight: 1.5,
            }}
          >
            Нажимайте на области изображения, отвечайте на вопросы и получайте мгновенную оценку.
          </Typography>
        </Box>

        <Box sx={{ zIndex: 2 }} />
      </Box>

      {}
      <Box
        sx={{
          width: { xs: "100%", md: "50%" },
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          p: 4,
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 380, py: 4 }}>
          {}
          <Box
            sx={{
              display: "flex",
              bgcolor: "#f1f3f5",
              borderRadius: "30px",
              p: 0.5,
              mb: 4,
            }}
          >
            <Button
              fullWidth
              disabled={submitting}
              onClick={onSwitchToLogin}
              sx={{
                borderRadius: "30px",
                py: 1,
                color: "#64748b",
                fontWeight: 600,
                "&:hover": { color: "#0f172a" },
              }}
            >
              Вход
            </Button>
            <Button
              fullWidth
              disabled={submitting}
              sx={{
                borderRadius: "30px",
                py: 1,
                bgcolor: "#ffffff",
                color: "#0f172a",
                fontWeight: 700,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                "&:hover": { bgcolor: "#ffffff" },
              }}
            >
              Регистрация
            </Button>
          </Box>

          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {error}
              </Alert>
            )}

            {}
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "#0f172a", mb: 1 }}
            >
              Я регистрируюсь как
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, mb: 2.5 }}>
              <Button
                fullWidth
                variant="outlined"
                disabled={submitting}
                onClick={() => setRole("student")}
                startIcon={<SchoolOutlinedIcon />}
                sx={{
                  py: 1,
                  borderRadius: "8px",
                  borderColor: role === "student" ? "#0043a4" : "#e2e8f0",
                  color: role === "student" ? "#0043a4" : "#0f172a",
                  bgcolor: role === "student" ? "rgba(0, 67, 180, 0.04)" : "transparent",
                  "&:hover": {
                    borderColor: role === "student" ? "#0043a4" : "#cbd5e1",
                    bgcolor: role === "student" ? "rgba(0, 67, 180, 0.06)" : "#f8fafc",
                  },
                }}
              >
                Студент
              </Button>
              <Button
                fullWidth
                variant="outlined"
                disabled={submitting}
                onClick={() => setRole("teacher")}
                startIcon={<EmojiEventsOutlinedIcon />}
                sx={{
                  py: 1,
                  borderRadius: "8px",
                  borderColor: role === "teacher" ? "#0043a4" : "#e2e8f0",
                  color: role === "teacher" ? "#0043a4" : "#0f172a",
                  bgcolor: role === "teacher" ? "rgba(0, 67, 180, 0.04)" : "transparent",
                  "&:hover": {
                    borderColor: role === "teacher" ? "#0043a4" : "#cbd5e1",
                    bgcolor: role === "teacher" ? "rgba(0, 67, 180, 0.06)" : "#f8fafc",
                  },
                }}
              >
                Преподаватель
              </Button>
            </Box>

            {}
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "#0f172a", mb: 0.8 }}
            >
              Имя и Фамилия
            </Typography>
            <TextField
              fullWidth
              disabled={submitting}
              placeholder="Введите ваше имя"
              variant="outlined"
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2.5 }}
            />

            {}
            {role === "student" ? (
              <>
                <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
                  <Box sx={{ width: "50%" }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "#0f172a", mb: 0.8 }}
                    >
                      Группа
                    </Typography>
                    <FormControl fullWidth size="small" disabled={submitting}>
                      <Select
                        value={group}
                        onChange={(e) => setGroup(e.target.value as string)}
                      >
                        <MenuItem value="Без группы">Без группы</MenuItem>
                        {availableGroups.map((g) => (
                          <MenuItem key={g.id} value={g.name}>
                            {g.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ width: "50%" }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "#0f172a", mb: 0.8 }}
                    >
                      Курс
                    </Typography>
                    <FormControl fullWidth size="small" disabled={submitting}>
                      <Select
                        value={course}
                        onChange={(e) => setCourse(e.target.value as string)}
                      >
                        <MenuItem value="—">—</MenuItem>
                        <MenuItem value="1 курс">1 курс</MenuItem>
                        <MenuItem value="2 курс">2 курс</MenuItem>
                        <MenuItem value="3 курс">3 курс</MenuItem>
                        <MenuItem value="4 курс">4 курс</MenuItem>
                        <MenuItem value="5 курс">5 курс</MenuItem>
                        <MenuItem value="6 курс">6 курс</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                {}
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "#0f172a", mb: 0.8 }}
                >
                  Дополнительно (специальность, заметка)
                </Typography>
                <TextField
                  fullWidth
                  disabled={submitting}
                  placeholder="напр. Биология, подгруппа Б"
                  variant="outlined"
                  size="small"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  sx={{ mb: 2.5 }}
                />
              </>
            ) : (
              <>
                {}
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "#0f172a", mb: 0.8 }}
                >
                  Предмет(ы)
                </Typography>
                <TextField
                  fullWidth
                  disabled={submitting}
                  placeholder="напр. Гистология, Анатомия"
                  variant="outlined"
                  size="small"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  sx={{ mb: 2.5 }}
                />
              </>
            )}

            {}
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "#0f172a", mb: 0.8 }}
            >
              Email
            </Typography>
            <TextField
              fullWidth
              disabled={submitting}
              placeholder="example@mail.com"
              variant="outlined"
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2.5 }}
            />

            {}
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "#0f172a", mb: 0.8 }}
            >
              Пароль
            </Typography>
            <TextField
              fullWidth
              disabled={submitting}
              type="password"
              placeholder="••••••••"
              variant="outlined"
              size="small"
              helperText="Пароль должен содержать не менее 10 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                bgcolor: "#0043a4",
                color: "#ffffff",
                py: 1.3,
                fontWeight: 700,
                borderRadius: "8px",
                "&:hover": { bgcolor: "#003390" },
                mb: 3,
              }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : "Создать аккаунт"}
            </Button>
          </form>
        </Box>
      </Box>
    </Box>
  );
};

const translations = {
  ru: {
    exams: "Экзамены",
    groups: "Группы",
    students: "Студенты",
    grades: "Оценки",
    profile: "Профиль",
    logout: "Выйти из системы",
    personalCabinet: "Личный кабинет",
    title: "Hotspot Exam",
    teacher: "ПРЕПОДАВАТЕЛЬ",
    student: "СТУДЕНТ",
    user: "Пользователь",
  },
  en: {
    exams: "Exams",
    groups: "Groups",
    students: "Students",
    grades: "Grades",
    profile: "Profile",
    logout: "Sign Out",
    personalCabinet: "Personal Cabinet",
    title: "Hotspot Exam",
    teacher: "TEACHER",
    student: "STUDENT",
    user: "User",
  }
};

interface ProfileSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const ProfileSettingsDialog: React.FC<ProfileSettingsDialogProps> = ({ open, onClose }) => {
  const { user, updateUser, themeMode, setThemeMode, language, setLanguage, logout } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [hideGrades, setHideGrades] = useState(false);
  const [faculty, setFaculty] = useState("");
  const [courseName, setCourseName] = useState("");
  const [department, setDepartment] = useState("");
  const [title, setTitle] = useState("");
  const [studentCode, setStudentCode] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    if (user && open) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setAddress(user.address || "");
      setIsPrivate(user.is_private || false);
      setHideGrades(user.hide_grades || false);

      if (user.role === "student" && user.student_profile) {
        setFaculty(user.student_profile.faculty || "");
        setCourseName(user.student_profile.course_name || "");
        setStudentCode(user.student_profile.student_code || "");
      } else if (user.role === "teacher" && user.teacher_profile) {
        setDepartment(user.teacher_profile.department || "");
        setTitle(user.teacher_profile.title || "");
      }

      setError(null);
      setSuccess(null);
      setShowPasswordChange(false);
    }
  }, [user, open]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        address: address,
        is_private: isPrivate,
        hide_grades: hideGrades,
      };

      if (user?.role === "student") {
        payload.faculty = faculty;
        payload.course_name = courseName;
      } else if (user?.role === "teacher") {
        payload.department = department;
        payload.title = title;
      }

      const res = await axios.put("/api/v1/auth/me", payload);
      const updatedUser = res.data;

      updateUser({
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        is_private: updatedUser.is_private,
        hide_grades: updatedUser.hide_grades,
        student_profile: updatedUser.student_profile,
        teacher_profile: updatedUser.teacher_profile,
      });

      setSuccess(language === "ru" ? "Профиль успешно сохранен!" : "Profile saved successfully!");
    } catch (err: any) {
      console.error("Failed to update profile", err);
      const msg = err.response?.data?.detail || (language === "ru" ? "Ошибка при обновлении профиля." : "Error updating profile.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(language === "ru" ? "Пароли не совпадают!" : "Passwords do not match!");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.put("/api/v1/auth/password", {
        old_password: oldPassword,
        new_password: newPassword,
      });

      setSuccess(language === "ru" ? "Пароль успешно изменен!" : "Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordChange(false);
    } catch (err: any) {
      console.error("Failed to update password", err);
      const msg = err.response?.data?.detail || (language === "ru" ? "Неверный текущий пароль или ошибка валидации." : "Incorrect current password or validation error.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`
    : "ПР";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          overflow: "hidden",
          bgcolor: "background.paper",
          backgroundImage: "none",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
        }
      }}
    >
      {}
      <Box
        sx={{
          p: 3,
          background: "linear-gradient(135deg, #0040b0 0%, #001f60 100%)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: 2.5,
          position: "relative"
        }}
      >
        <Avatar
          sx={{
            width: 72,
            height: 72,
            bgcolor: "rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "1.6rem",
            border: "3px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          {initials}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2 }}>
            {firstName} {lastName}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", mt: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
            {email}
            {user?.role === "student" && studentCode && (
              <Box
                component="span"
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  px: 1,
                  py: 0.2,
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontFamily: "monospace"
                }}
              >
                ID: {studentCode}
              </Box>
            )}
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: "rgba(255,255,255,0.15)",
            color: "#ffffff",
            px: 2,
            py: 0.8,
            borderRadius: "20px",
            fontSize: "0.78rem",
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: "uppercase"
          }}
        >
          {user?.role === "teacher"
            ? (language === "ru" ? "Преподаватель" : "Teacher")
            : (language === "ru" ? "Студент" : "Student")}
        </Box>
      </Box>

      <DialogContent sx={{ p: 4, bgcolor: "background.paper" }}>
        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: "8px" }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3, borderRadius: "8px" }}>{success}</Alert>}

        <Grid container spacing={4}>
          {}
          <Grid item xs={12} md={7} component="form" onSubmit={handleProfileSubmit}>
            <Typography variant="subtitle2" sx={{ mb: 2.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
              {language === "ru" ? "Личные данные" : "Personal Information"}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label={language === "ru" ? "Имя" : "First Name"}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label={language === "ru" ? "Фамилия" : "Last Name"}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label={language === "ru" ? "Телефон" : "Phone"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label={language === "ru" ? "Адрес" : "Address"}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Grid>

              {user?.role === "student" && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      label={language === "ru" ? "Факультет" : "Faculty"}
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      label={language === "ru" ? "Курс" : "Course"}
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                    />
                  </Grid>
                </>
              )}

              {user?.role === "teacher" && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      label={language === "ru" ? "Кафедра" : "Department"}
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      label={language === "ru" ? "Должность" : "Title / Post"}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </Grid>
                </>
              )}
            </Grid>

            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  bgcolor: "#0040b0",
                  py: 1,
                  px: 3,
                  fontWeight: 700,
                  borderRadius: "8px",
                  "&:hover": { bgcolor: "#003090" }
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : (language === "ru" ? "Сохранить профиль" : "Save Profile")}
              </Button>
            </Box>
          </Grid>

          {}
          <Grid item xs={12} md={5} sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                {language === "ru" ? "Настройки интерфейса" : "Preferences"}
              </Typography>

              {}
              <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setThemeMode("light")}
                  startIcon={<LightModeOutlinedIcon />}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontWeight: themeMode === "light" ? 700 : 500,
                    borderColor: themeMode === "light" ? "#0040b0" : "divider",
                    bgcolor: themeMode === "light" ? "rgba(0, 64, 176, 0.05)" : "transparent",
                    color: themeMode === "light" ? "#0040b0" : "text.secondary"
                  }}
                >
                  {language === "ru" ? "Светлая" : "Light"}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setThemeMode("dark")}
                  startIcon={<DarkModeOutlinedIcon />}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontWeight: themeMode === "dark" ? 700 : 500,
                    borderColor: themeMode === "dark" ? "#0040b0" : "divider",
                    bgcolor: themeMode === "dark" ? "rgba(0, 64, 176, 0.05)" : "transparent",
                    color: themeMode === "dark" ? "#0040b0" : "text.secondary"
                  }}
                >
                  {language === "ru" ? "Темная" : "Dark"}
                </Button>
              </Box>

              {}
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setLanguage("ru")}
                  startIcon={<TranslateOutlinedIcon />}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontWeight: language === "ru" ? 700 : 500,
                    borderColor: language === "ru" ? "#0040b0" : "divider",
                    bgcolor: language === "ru" ? "rgba(0, 64, 176, 0.05)" : "transparent",
                    color: language === "ru" ? "#0040b0" : "text.secondary"
                  }}
                >
                  Русский
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setLanguage("en")}
                  startIcon={<TranslateOutlinedIcon />}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontWeight: language === "en" ? 700 : 500,
                    borderColor: language === "en" ? "#0040b0" : "divider",
                    bgcolor: language === "en" ? "rgba(0, 64, 176, 0.05)" : "transparent",
                    color: language === "en" ? "#0040b0" : "text.secondary"
                  }}
                >
                  English
                </Button>
              </Box>
            </Box>

            {}
            {user?.role === "student" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                  {language === "ru" ? "Конфиденциальность" : "Privacy"}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                      {language === "ru" ? "Приватный профиль (скрыть контакты)" : "Private Profile (hide contact details)"}
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={hideGrades}
                      onChange={(e) => setHideGrades(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                      {language === "ru" ? "Скрыть оценки и GPA от студентов" : "Hide grades and GPA from other students"}
                    </Typography>
                  }
                />
              </Box>
            )}

            {}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                {language === "ru" ? "Безопасность и аккаунт" : "Account Controls"}
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<LockOutlinedIcon />}
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    py: 1,
                    fontWeight: 600,
                    borderColor: "divider",
                    color: "text.primary"
                  }}
                >
                  {language === "ru" ? "Сменить пароль" : "Change Password"}
                </Button>

                {}
                <Collapse in={showPasswordChange}>
                  <Box component="form" onSubmit={handlePasswordSubmit} sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1.5, p: 2, border: "1px dashed", borderColor: "divider", borderRadius: "8px" }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      type="password"
                      label={language === "ru" ? "Текущий пароль" : "Current Password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      type="password"
                      label={language === "ru" ? "Новый пароль" : "New Password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      inputProps={{ minLength: 6 }}
                    />
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      type="password"
                      label={language === "ru" ? "Подтвердите пароль" : "Confirm Password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      size="small"
                      disabled={loading}
                      sx={{ bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e293b" } }}
                    >
                      {loading ? <CircularProgress size={16} color="inherit" /> : (language === "ru" ? "Обновить пароль" : "Change Password")}
                    </Button>
                  </Box>
                </Collapse>

                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<ExitToAppIcon />}
                  onClick={handleLogout}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    py: 1,
                    fontWeight: 700,
                    borderColor: "#fecdd3",
                    bgcolor: "rgba(239, 68, 68, 0.02)",
                    "&:hover": {
                      bgcolor: "rgba(239, 68, 68, 0.08)",
                      borderColor: "#ef4444"
                    }
                  }}
                >
                  {language === "ru" ? "Выйти из аккаунта" : "Log Out"}
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 4, pt: 0, bgcolor: "background.paper", gap: 1.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: "8px", textTransform: "none", px: 3 }}>
          {language === "ru" ? "Закрыть" : "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface UserProfileDialogProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

export const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ userId, open, onClose }) => {
  const { user: currentUser, language } = useAuth();
  const [profileUser, setProfileUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId && open) {
      const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await axios.get(`/api/v1/students/${userId}`);
          setProfileUser(res.data);
        } catch (err) {
          console.error("Failed to fetch user profile", err);
          setError(language === "ru" ? "Не удалось загрузить профиль пользователя." : "Failed to load user profile.");
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    } else {
      setProfileUser(null);
    }
  }, [userId, open, language]);

  if (!open) return null;

  const initials = profileUser
    ? `${profileUser.first_name?.[0] || ""}${profileUser.last_name?.[0] || ""}`
    : "??";

  const isTeacherOrAdmin = currentUser?.role === "teacher" || currentUser?.role === "admin";
  const showMaskMessage = profileUser?.is_private && !isTeacherOrAdmin && profileUser?.id !== currentUser?.id;
  const showGradesMaskMessage = profileUser?.role === "student" && profileUser?.hide_grades && !isTeacherOrAdmin && profileUser?.id !== currentUser?.id;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          overflow: "hidden",
          bgcolor: "background.paper",
          backgroundImage: "none",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
        }
      }}
    >
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box p={3}>
          <Alert severity="error">{error}</Alert>
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button onClick={onClose} variant="outlined">{language === "ru" ? "Закрыть" : "Close"}</Button>
          </Box>
        </Box>
      ) : profileUser ? (
        <Box>
          {}
          <Box
            sx={{
              p: 3,
              background: "linear-gradient(135deg, #0040b0 0%, #001f60 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 2.5
            }}
          >
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: "rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "1.4rem",
                border: "2px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {profileUser.first_name} {profileUser.last_name}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", mt: 0.5 }}>
                {profileUser.role === "teacher"
                  ? (language === "ru" ? "Преподаватель" : "Teacher")
                  : (language === "ru" ? "Студент" : "Student")}
              </Typography>
            </Box>
            {profileUser.is_private && (
              <Box
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: "12px",
                  fontSize: "0.7rem",
                  fontWeight: 700
                }}
              >
                🔒 {language === "ru" ? "Приватный" : "Private"}
              </Box>
            )}
          </Box>

          <DialogContent sx={{ p: 3 }}>
            {showMaskMessage && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: "8px" }}>
                {language === "ru"
                  ? "Этот профиль скрыт настройками приватности. Контактные данные недоступны для просмотра другим студентам."
                  : "This profile is private. Contact details are hidden from other students."}
              </Alert>
            )}
            {showGradesMaskMessage && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: "8px" }}>
                {language === "ru"
                  ? "Студент скрыл информацию о своей успеваемости (оценки и GPA) от других студентов."
                  : "The student has hidden their academic performance (grades and GPA) from other students."}
              </Alert>
            )}

            <Grid container spacing={2}>
              {}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                  Email
                </Typography>
                <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 500 }}>
                  {profileUser.email}
                </Typography>
              </Grid>

              {}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                  {language === "ru" ? "Телефон" : "Phone"}
                </Typography>
                <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 500 }}>
                  {profileUser.phone || "—"}
                </Typography>
              </Grid>

              {}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                  {language === "ru" ? "Адрес" : "Address"}
                </Typography>
                <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 500 }}>
                  {profileUser.address || "—"}
                </Typography>
              </Grid>

              {}
              {profileUser.role === "student" && profileUser.student_profile && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                      {language === "ru" ? "Факультет" : "Faculty"}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 500 }}>
                      {profileUser.student_profile.faculty || "—"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                      {language === "ru" ? "Курс" : "Course"}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 500 }}>
                      {profileUser.student_profile.course_name || "—"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                      {language === "ru" ? "Средний балл (GPA)" : "Average Score (GPA)"}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 800 }}>
                      {profileUser.student_profile.average_score !== null && profileUser.student_profile.average_score !== undefined
                        ? `${profileUser.student_profile.average_score}%`
                        : (language === "ru" ? "[Скрыто]" : "[Hidden]")}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                      {language === "ru" ? "Завершено экзаменов" : "Completed Exams"}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 600 }}>
                      {profileUser.student_profile.completed_exams !== null && profileUser.student_profile.completed_exams !== undefined
                        ? profileUser.student_profile.completed_exams
                        : (language === "ru" ? "[Скрыто]" : "[Hidden]")}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                      {language === "ru" ? "Код студента (ID)" : "Student Code (ID)"}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 500, fontFamily: "monospace" }}>
                      {profileUser.student_profile.student_code || "—"}
                    </Typography>
                  </Grid>
                </>
              )}

              {profileUser.role === "teacher" && profileUser.teacher_profile && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                      {language === "ru" ? "Кафедра" : "Department"}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 500 }}>
                      {profileUser.teacher_profile.department || "—"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                      {language === "ru" ? "Должность" : "Title / Post"}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 500 }}>
                      {profileUser.teacher_profile.title || "—"}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={onClose} variant="outlined" sx={{ borderRadius: "8px", textTransform: "none", px: 3 }}>
              {language === "ru" ? "Закрыть" : "Close"}
            </Button>
          </DialogActions>
        </Box>
      ) : null}
    </Dialog>
  );
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, language } = useAuth();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const t = translations[language || "ru"];

  const menuItems = [
    { text: t.exams, icon: <DescriptionOutlinedIcon fontSize="small" />, path: "/exams" },
    { text: t.groups, icon: <PeopleAltOutlinedIcon fontSize="small" />, path: "/groups", teacherOnly: true },
    { text: t.students, icon: <SchoolOutlinedIcon fontSize="small" />, path: "/students" },
    { text: t.grades, icon: <EmojiEventsOutlinedIcon fontSize="small" />, path: "/grades" },
  ].filter(item => !item.teacherOnly || (user?.role === "teacher" || user?.role === "admin"));

  const handleProfileClick = () => {
    setProfileOpen(true);
  };

  const isFullScreenView =
    location.pathname.includes("/take") || location.pathname.includes("/slides/");

  if (isFullScreenView) {
    return <Box sx={{ display: "flex", width: "100%", height: "100%", bgcolor: "background.default" }}>{children}</Box>;
  }

  const getActiveTab = () => {
    if (location.pathname.startsWith("/exams")) return 0;
    if (location.pathname.startsWith("/groups")) return 1;
    if (location.pathname.startsWith("/students")) return 2;
    if (location.pathname.startsWith("/grades")) return 3;
    return 0;
  };

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`
    : "ПР";

  const displayName = user
    ? user.full_name
    : t.user;

  const displayRole = user
    ? user.role === "teacher"
      ? t.teacher
      : user.role === "student"
      ? t.student
      : user.role.toUpperCase()
    : t.user.toUpperCase();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: 1100,
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 4 }, height: 70, display: "flex", justifyContent: "space-between" }}>
          {}
          <Box
            component={Link}
            to="/dashboard"
            sx={{ display: "flex", alignItems: "center", textDecoration: "none", color: "text.primary" }}
          >
            <LogoIcon color="#0043a4" style={{ marginRight: 8 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", color: "text.primary", letterSpacing: 0.1 }}>
              {t.title}
            </Typography>
          </Box>

          {}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 3.5 }}>
            {menuItems.map((item, index) => {
              const isActive = getActiveTab() === index;
              return (
                <Box
                  key={item.text}
                  component={Link}
                  to={item.path}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    textDecoration: "none",
                    color: isActive ? "primary.main" : "text.secondary",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "0.92rem",
                    transition: "color 0.2s ease",
                    cursor: "pointer",
                    "&:hover": {
                      color: "primary.main",
                    },
                  }}
                >
                  <Box sx={{ mr: 0.8, display: "flex", color: "inherit" }}>{item.icon}</Box>
                  {item.text}
                </Box>
              );
            })}
          </Box>

          {}
          {user && (
            <Box
              onClick={handleProfileClick}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                cursor: "pointer",
                p: 0.5,
                borderRadius: "30px",
                transition: "background-color 0.2s",
                "&:hover": { bgcolor: "background.default" },
              }}
            >
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: "background.default",
                  color: "text.secondary",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {initials}
              </Avatar>
              <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left" }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.88rem", lineHeight: 1.2 }}>
                  {displayName}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.5 }}>
                  {displayRole}
                </Typography>
              </Box>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {}
      <Box
        component="main"
        sx={{
          pt: 12,
          px: { xs: 2, sm: 4 },
          pb: { xs: 12, md: 6 },
          boxSizing: "border-box",
        }}
      >
        {children}
      </Box>

      {user && (
        <Paper
          elevation={10}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: { xs: "flex", md: "none" },
            justifyContent: "space-around",
            alignItems: "center",
            height: 64,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            zIndex: 1000,
            pb: "safe-area-inset-bottom",
          }}
        >
          {menuItems.map((item, index) => {
            const isActive = getActiveTab() === index;
            return (
              <Box
                key={item.text}
                component={Link}
                to={item.path}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  color: isActive ? "primary.main" : "text.secondary",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  flex: 1,
                  py: 1,
                  transition: "color 0.2s ease",
                  "&:hover": {
                    color: "primary.main",
                  },
                }}
              >
                <Box sx={{ display: "flex", color: "inherit", mb: 0.3 }}>
                  {item.icon}
                </Box>
                {item.text}
              </Box>
            );
          })}
        </Paper>
      )}

      <ProfileSettingsDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Box>
  );
};

import VerifyEmailPage from "./pages/VerifyEmailPage";

let globalAlertHandler: ((message: string) => void) | null = null;

if (typeof window !== "undefined") {
  window.alert = (message: string) => {
    if (globalAlertHandler) {
      globalAlertHandler(message);
    } else {
      console.log("Alert buffered:", message);
    }
  };
}

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  const initialAuthPage = window.location.pathname === "/verify-email" ? "verify-email" : "login";
  const [authPage, setAuthPage] = useState<"login" | "register" | "verify-email">(initialAuthPage);
  const [initializing, setInitializing] = useState<boolean>(true);

  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme_mode") as "light" | "dark") || "light";
  });
  const [language, setLanguage] = useState<"ru" | "en">(() => {
    return (localStorage.getItem("language") as "ru" | "en") || "ru";
  });

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  useEffect(() => {
    globalAlertHandler = (message: string) => {
      setSnackbarMessage(message);
      setSnackbarOpen(true);
    };
    return () => {
      globalAlertHandler = null;
    };
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleSetThemeMode = (mode: "light" | "dark") => {
    setThemeMode(mode);
    localStorage.setItem("theme_mode", mode);
  };

  const handleSetLanguage = (lang: "ru" | "en") => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      if (updatedFields.first_name || updatedFields.last_name) {
        updated.full_name = `${updated.first_name || ""} ${updated.last_name || ""}`.trim();
      }
      return updated;
    });
  };

  useEffect(() => {
    const autoLogin = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        try {
          const res = await axios.get("/api/v1/auth/me");
          const u = res.data;
          setUser({
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            full_name: `${u.first_name} ${u.last_name}`.trim(),
            email: u.email,
            phone: u.phone,
            address: u.address,
            is_private: u.is_private,
            hide_grades: u.hide_grades,
            role: u.role,
            student_profile: u.student_profile,
            teacher_profile: u.teacher_profile,
          });
          setIsAuthenticated(true);
        } catch (e) {
          console.error("Auto login verification failed. Trying token refresh.", e);
          const refreshToken = localStorage.getItem("refresh_token");
          if (refreshToken) {
            try {
              const refreshRes = await axios.post("/api/v1/auth/refresh", { refresh_token: refreshToken });
              const data = refreshRes.data;
              localStorage.setItem("access_token", data.access_token);
              localStorage.setItem("refresh_token", data.refresh_token);
              axios.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;

              const meRes = await axios.get("/api/v1/auth/me");
              const u = meRes.data;
              setUser({
                id: u.id,
                first_name: u.first_name,
                last_name: u.last_name,
                full_name: `${u.first_name} ${u.last_name}`.trim(),
                email: u.email,
                is_private: u.is_private,
                hide_grades: u.hide_grades,
                role: u.role,
                student_profile: u.student_profile,
                teacher_profile: u.teacher_profile,
              });
              setIsAuthenticated(true);
            } catch (err) {
              console.error("Token refresh failed.", err);

              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              delete axios.defaults.headers.common["Authorization"];
            }
          } else {
            localStorage.removeItem("access_token");
            delete axios.defaults.headers.common["Authorization"];
          }
        }
      }
      setInitializing(false);
    };

    autoLogin();
  }, []);

  const login = async (emailOrUsername: string, passwordText: string) => {
    try {
      const res = await axios.post("/api/v1/auth/login", {
        username_or_email: emailOrUsername,
        password: passwordText
      });
      const data = res.data;
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;

      const meRes = await axios.get("/api/v1/auth/me");
      const u = meRes.data;
      setUser({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        full_name: `${u.first_name} ${u.last_name}`.trim(),
        email: u.email,
        phone: u.phone,
        address: u.address,
        is_private: u.is_private,
        hide_grades: u.hide_grades,
        role: u.role,
        student_profile: u.student_profile,
        teacher_profile: u.teacher_profile,
      });
      setIsAuthenticated(true);
      return { success: true };
    } catch (e: any) {
      console.error(e);
      const detail = e.response?.data?.detail || "Неверный Email/Имя пользователя или Пароль.";
      return { success: false, error: detail };
    }
  };

  const register = async (data: any, selectedRole: "student" | "teacher") => {
    try {
      if (selectedRole === "student") {
        await axios.post("/api/v1/auth/register/student", {
          email: data.email,
          password: data.password,
          first_name: data.first_name,
          last_name: data.last_name || "Студент",
          student_code: "ST-" + Math.floor(Math.random() * 1000000),
          faculty: data.details || "Медицинский",
          course_name: data.course || "1 курс",
          group_name: data.group || "Без группы"
        });
      } else {
        await axios.post("/api/v1/auth/register/teacher", {
          email: data.email,
          password: data.password,
          first_name: data.first_name,
          last_name: data.last_name || "Преподаватель",
          username: data.email.split("@")[0] + "_" + Math.floor(Math.random() * 1000),
          department: data.details || "Кафедра гистологии",
          title: "Преподаватель"
        });
      }

      return await login(data.email, data.password);
    } catch (e: any) {
      console.error(e);
      const detail = e.response?.data?.detail || "Ошибка при регистрации. Проверьте правильность полей.";
      return { success: false, error: detail };
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    setIsAuthenticated(false);
  };

  if (initializing) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" bgcolor="#f8fafc">
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
          Проверка сессии...
        </Typography>
      </Box>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        logout,
        updateUser,
        themeMode,
        setThemeMode: handleSetThemeMode,
        language,
        setLanguage: handleSetLanguage,
      }}
    >
      <ThemeProvider theme={getAppTheme(themeMode)}>
        <CssBaseline />
        {!isAuthenticated ? (
          authPage === "login" ? (
            <LoginPage onSwitchToRegister={() => setAuthPage("register")} />
          ) : authPage === "register" ? (
            <RegisterPage onSwitchToLogin={() => setAuthPage("login")} />
          ) : (
            <VerifyEmailPage onGoToLogin={() => setAuthPage("login")} />
          )
        ) : (
          <BrowserRouter>
            <DataProvider>
              <AppLayout>
                <Suspense fallback={<Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route
                    path="/dashboard"
                    element={
                      user?.role === "student" ? (
                        <StudentDashboard />
                      ) : (
                        <TeacherDashboard />
                      )
                    }
                  />
                  <Route path="/exams" element={<ExamListPage />} />
                  <Route path="/exams/:examId/take" element={<ExamTakePage />} />
                  <Route path="/slides/:slideId" element={<SlideViewPage />} />
                  <Route path="/groups" element={user?.role === "teacher" || user?.role === "admin" ? <GroupsPage /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/students" element={<StudentsPage />} />
                  <Route path="/grades" element={<GradesPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
                </Suspense>
              </AppLayout>
            </DataProvider>
          </BrowserRouter>
        )}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          sx={{ mb: { xs: 8, md: 0 } }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 2,
              px: 2.5,
              bgcolor: "text.primary",
              color: "background.paper",
              borderRadius: "10px",
              fontSize: "0.88rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              maxWidth: 350,
            }}
          >
            {snackbarMessage}
          </Paper>
        </Snackbar>
      </ThemeProvider>
    </AuthContext.Provider>
  );
};

export default App;

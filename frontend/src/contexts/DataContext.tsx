import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../App";

export interface GroupData {
  id: string;
  name: string;
  description: string;
  course_title: string;
  student_count: number;
  average_score: number;
  pass_rate: number;
  fail_rate: number;
  total_attempts: number;
}

export interface StudentData {
  id: string;
  name: string;
  email: string;
  group_name: string;
  group_id: string;
  average_score: number;
  completed_exams: number;
  hide_grades?: boolean;
}

interface DataContextType {
  groups: GroupData[];
  students: StudentData[];
  loading: boolean;
  error: string | null;
  addGroup: (name: string, courseTitle: string, description?: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  updateStudentGroup: (studentId: string, groupId: string | null, groupName: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};

const generateUUID = (): string => {
  return (
    (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
    "11111111-1111-4111-b111-111111111111".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
  );
};

const getDeterministicGroupId = (name: string): string => {
  if (name === "Группа A") return "7c317689-6156-4d5f-8c0b-993c7a3f235c";
  if (name === "Группа Б") return "9b8370cd-5566-4dae-852b-ee51bd07a8c1";
  return generateUUID();
};

const getDeterministicStudentId = (email: string): string => {
  const mapping: Record<string, string> = {
    "alex@edu.ru": "e68f9106-7e45-434f-ab02-e99c9a9063eb",
    "maria@edu.ru": "87f862de-c775-4f78-9a5a-cf83636585c5",
    "dmitry@edu.ru": "557fb72a-6a7f-489f-8e5e-672b1ab5c291",
    "olga@edu.ru": "5371ac95-d76d-470a-9267-d411b0933ddb",
    "nikolay@edu.ru": "4b5828c9-3512-4cda-83c5-90c9c6b527b6",
    "anna@edu.ru": "6fab2e60-85de-4579-874b-20c5c0b323fc",
  };
  return mapping[email] || generateUUID();
};

const MOCK_GROUPS: GroupData[] = [
  {
    id: "7c317689-6156-4d5f-8c0b-993c7a3f235c",
    name: "Группа A",
    description: "Основная группа по анатомии",
    course_title: "Анатомия и гистология",
    student_count: 3,
    average_score: 82.4,
    pass_rate: 90.0,
    fail_rate: 10.0,
    total_attempts: 10,
  },
  {
    id: "9b8370cd-5566-4dae-852b-ee51bd07a8c1",
    name: "Группа Б",
    description: "Группа по гистологии органов",
    course_title: "Гистология органов",
    student_count: 3,
    average_score: 76.8,
    pass_rate: 80.0,
    fail_rate: 20.0,
    total_attempts: 15,
  },
];

const MOCK_STUDENTS: StudentData[] = [
  { id: "e68f9106-7e45-434f-ab02-e99c9a9063eb", name: "Алексей Иванов", email: "alex@edu.ru", group_name: "Группа A", group_id: "7c317689-6156-4d5f-8c0b-993c7a3f235c", average_score: 88.5, completed_exams: 4 },
  { id: "87f862de-c775-4f78-9a5a-cf83636585c5", name: "Мария Соколова", email: "maria@edu.ru", group_name: "Группа A", group_id: "7c317689-6156-4d5f-8c0b-993c7a3f235c", average_score: 92.4, completed_exams: 4 },
  { id: "557fb72a-6a7f-489f-8e5e-672b1ab5c291", name: "Дмитрий Смирнов", email: "dmitry@edu.ru", group_name: "Группа A", group_id: "7c317689-6156-4d5f-8c0b-993c7a3f235c", average_score: 74.5, completed_exams: 3 },
  { id: "5371ac95-d76d-470a-9267-d411b0933ddb", name: "Ольга Петрова", email: "olga@edu.ru", group_name: "Группа Б", group_id: "9b8370cd-5566-4dae-852b-ee51bd07a8c1", average_score: 82.0, completed_exams: 4 },
  { id: "4b5828c9-3512-4cda-83c5-90c9c6b527b6", name: "Николай Козлов", email: "nikolay@edu.ru", group_name: "Группа Б", group_id: "9b8370cd-5566-4dae-852b-ee51bd07a8c1", average_score: 78.3, completed_exams: 3 },
  { id: "6fab2e60-85de-4579-874b-20c5c0b323fc", name: "Анна Волкова", email: "anna@edu.ru", group_name: "Группа Б", group_id: "9b8370cd-5566-4dae-852b-ee51bd07a8c1", average_score: 70.1, completed_exams: 2 },
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    const isTeacher = user?.role === "teacher" || user?.role === "admin";

    try {
      let groupStats: any[] = [];
      let studentRankings: any[] = [];

      if (isTeacher) {
        try {
          const analyticsRes = await axios.get("/api/v1/analytics/teacher");
          groupStats = analyticsRes.data.group_statistics || [];
          studentRankings = analyticsRes.data.student_rankings || [];
        } catch (err) {
          console.error("Failed to load teacher analytics", err);
        }
      }

      let apiGroups: any[] = [];
      let apiStudents: any[] = [];

      try {

        const groupsUrl = isTeacher ? "/api/v1/groups/" : "/api/v1/groups/public";
        const [gRes, sRes] = await Promise.all([
          axios.get(groupsUrl),
          axios.get("/api/v1/students/"),
        ]);
        apiGroups = gRes.data || [];
        apiStudents = sRes.data || [];
      } catch (err) {
        console.error("Failed to load CRUD/public groups and students", err);
      }

      const mergedGroups: GroupData[] = [];
      if (isTeacher && groupStats.length > 0) {
        groupStats.forEach((gs: any) => {
          const apiGroup = apiGroups.find((ag: any) => ag.name === gs.group_name);
          mergedGroups.push({
            id: apiGroup?.id || getDeterministicGroupId(gs.group_name),
            name: gs.group_name,
            description: apiGroup?.description || "",
            course_title: gs.course_title || "",
            student_count: apiGroup?.student_count ?? 0,
            average_score: gs.average_score ?? 0,
            pass_rate: gs.pass_rate ?? 0,
            fail_rate: gs.fail_rate ?? 0,
            total_attempts: gs.total_attempts ?? 0,
          });
        });
      }

      apiGroups.forEach((ag: any) => {
        if (!mergedGroups.find(g => g.id === ag.id || g.name === ag.name)) {
          mergedGroups.push({
            id: ag.id,
            name: ag.name,
            description: ag.description || "",
            course_title: "",
            student_count: ag.student_count ?? 0,
            average_score: 0,
            pass_rate: 0,
            fail_rate: 0,
            total_attempts: 0,
          });
        }
      });

      const mergedStudents: StudentData[] = [];
      if (isTeacher && studentRankings.length > 0) {
        studentRankings.forEach((sr: any) => {
          const apiStudent = apiStudents.find((as_: any) => as_.email === sr.email);
          mergedStudents.push({
            id: sr.id || apiStudent?.id || getDeterministicStudentId(sr.email),
            name: sr.student_name,
            email: sr.email,
            group_name: sr.group_name || "Без группы",
            group_id: apiStudent?.group_id || (sr.group_name ? getDeterministicGroupId(sr.group_name) : ""),
            average_score: sr.average_score ?? 0,
            completed_exams: sr.completed_exams ?? 0,
            hide_grades: sr.hide_grades,
          });
        });
      }

      apiStudents.forEach((as_: any) => {
        if (!mergedStudents.find(s => s.id === as_.id || s.email === as_.email)) {
          mergedStudents.push({
            id: as_.id,
            name: as_.name,
            email: as_.email,
            group_name: as_.group_name || "Без группы",
            group_id: as_.group_id || "",
            average_score: 0,
            completed_exams: 0,
          });
        }
      });

      if (import.meta.env.DEV && mergedGroups.length === 0 && mergedStudents.length === 0) {
        setGroups(MOCK_GROUPS);
        setStudents(MOCK_STUDENTS);
        setError("Используются демонстрационные данные.");
      } else {
        setGroups(mergedGroups);
        setStudents(mergedStudents);
      }
    } catch (err) {
      console.error("Critical error in fetchData:", err);
      setError("Unable to load dashboard data.");
      if (import.meta.env.DEV) {
        setGroups(MOCK_GROUPS);
        setStudents(MOCK_STUDENTS);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return () => {};
    fetchData(false);
    const timer = setInterval(() => {
      fetchData(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [user, fetchData]);

  const addGroup = useCallback(async (name: string, courseTitle: string, description?: string) => {
    const tempId = generateUUID();
    const newGroup: GroupData = {
      id: tempId,
      name,
      description: description || "",
      course_title: courseTitle,
      student_count: 0,
      average_score: 0,
      pass_rate: 0,
      fail_rate: 0,
      total_attempts: 0,
    };

    setGroups(prev => [...prev, newGroup]);

    try {
      const res = await axios.post("/api/v1/groups/", { name, description: description || "" });

      setGroups(prev =>
        prev.map(g => (g.id === tempId ? { ...g, id: res.data.id } : g))
      );
    } catch {

    }
  }, []);

  const deleteGroup = useCallback(async (groupId: string) => {
    const groupToDelete = groups.find(g => g.id === groupId);

    setGroups(prev => prev.filter(g => g.id !== groupId));

    if (groupToDelete) {
      setStudents(prev =>
        prev.map(s =>
          s.group_name === groupToDelete.name
            ? { ...s, group_name: "Без группы", group_id: "" }
            : s
        )
      );
    }

    try {
      await axios.delete(`/api/v1/groups/${groupId}`);
    } catch {

    }
  }, [groups]);

  const updateStudentGroup = useCallback(async (studentId: string, groupId: string | null, groupName: string) => {
    setStudents(prev =>
      prev.map(s =>
        s.id === studentId
          ? { ...s, group_id: groupId || "", group_name: groupName || "Без группы" }
          : s
      )
    );

    try {
      await axios.put(`/api/v1/students/${studentId}/group`, { group_id: groupId });
    } catch {

    }
  }, []);

  return (
    <DataContext.Provider
      value={{
        groups,
        students,
        loading,
        error,
        addGroup,
        deleteGroup,
        updateStudentGroup,
        refreshData: fetchData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export default DataProvider;

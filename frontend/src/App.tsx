import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { ExerciseStatsListPage } from "./pages/ExerciseStatsListPage";
import { ExerciseStatsPage } from "./pages/ExerciseStatsPage";
import { GoalsPage } from "./pages/GoalsPage";
import { LoginPage } from "./pages/LoginPage";
import { MeasurementsPage } from "./pages/MeasurementsPage";
import { MonthlyReportPage } from "./pages/MonthlyReportPage";
import { MuscleDistributionPage } from "./pages/MuscleDistributionPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProgressPage } from "./pages/ProgressPage";
import { SessionDetailPage } from "./pages/SessionDetailPage";
import { SetsByMusclePage } from "./pages/SetsByMusclePage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { TopExercisesPage } from "./pages/TopExercisesPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RoutineDetailPage } from "./pages/RoutineDetailPage";
import { RoutinesPage } from "./pages/RoutinesPage";
import { WorkoutPage } from "./pages/WorkoutPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/routines"
            element={
              <ProtectedRoute>
                <RoutinesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/routines/:id"
            element={
              <ProtectedRoute>
                <RoutineDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workout"
            element={
              <ProtectedRoute>
                <WorkoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <ProgressPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/measurements"
            element={
              <ProtectedRoute>
                <MeasurementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <GoalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exercises"
            element={
              <ProtectedRoute>
                <ExercisesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics"
            element={
              <ProtectedRoute>
                <StatisticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics/muscle-distribution"
            element={
              <ProtectedRoute>
                <MuscleDistributionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics/sets-by-muscle"
            element={
              <ProtectedRoute>
                <SetsByMusclePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics/top-exercises"
            element={
              <ProtectedRoute>
                <TopExercisesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics/monthly-report"
            element={
              <ProtectedRoute>
                <MonthlyReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sessions/:id"
            element={
              <ProtectedRoute>
                <SessionDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exercise-stats"
            element={
              <ProtectedRoute>
                <ExerciseStatsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exercise-stats/:id"
            element={
              <ProtectedRoute>
                <ExerciseStatsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

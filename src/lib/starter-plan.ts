import type { DayKind } from "./exercises";

/**
 * The plan a brand-new account starts with: a classic push / pull / legs split
 * so the app is immediately usable. Every row can be renamed, reordered or
 * deleted by the user.
 */
export const STARTER_PLAN: {
  name: string;
  kind: DayKind;
  exercises: { id: string; name: string; sets: number; reps: number; kg: number }[];
}[] = [
  {
    name: "Push",
    kind: "push",
    exercises: [
      { id: "Barbell_Bench_Press_-_Medium_Grip", name: "Barbell Bench Press - Medium Grip", sets: 4, reps: 8, kg: 40 },
      { id: "Incline_Dumbbell_Press", name: "Incline Dumbbell Press", sets: 3, reps: 10, kg: 16 },
      { id: "Barbell_Shoulder_Press", name: "Barbell Shoulder Press", sets: 3, reps: 10, kg: 25 },
      { id: "Side_Lateral_Raise", name: "Side Lateral Raise", sets: 3, reps: 12, kg: 8 },
      { id: "Triceps_Pushdown", name: "Triceps Pushdown", sets: 3, reps: 12, kg: 20 },
    ],
  },
  {
    name: "Pull",
    kind: "pull",
    exercises: [
      { id: "Barbell_Deadlift", name: "Barbell Deadlift", sets: 3, reps: 6, kg: 60 },
      { id: "Pullups", name: "Pullups", sets: 3, reps: 8, kg: 0 },
      { id: "Bent_Over_Barbell_Row", name: "Bent Over Barbell Row", sets: 4, reps: 10, kg: 35 },
      { id: "Wide-Grip_Lat_Pulldown", name: "Wide-Grip Lat Pulldown", sets: 3, reps: 12, kg: 40 },
      { id: "Barbell_Curl", name: "Barbell Curl", sets: 3, reps: 12, kg: 20 },
    ],
  },
  {
    name: "Legs",
    kind: "legs",
    exercises: [
      { id: "Barbell_Squat", name: "Barbell Squat", sets: 4, reps: 8, kg: 50 },
      { id: "Romanian_Deadlift", name: "Romanian Deadlift", sets: 3, reps: 10, kg: 40 },
      { id: "Leg_Press", name: "Leg Press", sets: 3, reps: 12, kg: 80 },
      { id: "Seated_Leg_Curl", name: "Seated Leg Curl", sets: 3, reps: 12, kg: 30 },
      { id: "Standing_Calf_Raises", name: "Standing Calf Raises", sets: 4, reps: 15, kg: 40 },
    ],
  },
  { name: "Rest", kind: "rest", exercises: [] },
];

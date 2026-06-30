# Co-Gym Assistant Project Instructions

## Project Summary

This project is for building a personal fitness web app called **Co-Gym Assistant**.

The app should use the exercise dataset in this repository to generate safe, structured home workouts. The goal is to support muscle preservation and muscle building while losing fat.

This is a personal training assistant, not a medical app.

## User Context

The user is starting Mounjaro/tirzepatide and wants a sustainable home training system.

Available equipment:

- Dumbbells
- Resistance bands / stretch rope
- Bodyweight

Unavailable equipment:

- Gym machines
- Barbells
- Cable machines
- Smith machine
- Full gym setup
- Bench, unless there is a safe floor-based substitute

## Product Philosophy

Prioritize:

- Muscle preservation
- Progressive strength training
- Consistency
- Recovery
- Safe progression
- Simple execution
- Home-friendly workouts

Do not prioritize:

- Extreme fat loss
- Punishing calorie-burn workouts
- Unsafe high-intensity plans
- Overly complex fitness tracking
- Medical claims
- Medication advice

The app should avoid language like “rapid fat loss” or “fat loss hacks.”  
Use framing like:

> “muscle-preserving fat loss”  
> “safe home strength training”  
> “progressive training while losing weight”

## Health and Safety Guardrails

The app should include readiness checks before workouts.

Track or ask about:

- Nausea
- Dizziness
- Hydration
- Energy
- Sleep
- Soreness
- Appetite / under-fueling risk
- Injection day or post-injection fatigue

If the user reports red-flag symptoms, the app should recommend one of:

- Rest
- Light walking
- Mobility
- Stretching
- Lower-intensity workout
- Clinician guidance when appropriate

The app must not:

- Recommend medication changes
- Recommend skipping meals
- Recommend dehydration tactics
- Recommend training through dizziness or severe nausea
- Make medical claims
- Replace clinician advice

Always include a clear disclaimer where appropriate:

> This app does not provide medical advice. Follow your clinician’s guidance, especially when using prescription medication.

## Dataset Handling

Before making assumptions, inspect the actual dataset files.

The dataset should be treated as raw material that may need:

- Cleaning
- Normalization
- Exercise filtering
- Equipment filtering
- Muscle group tagging
- Difficulty tagging
- Movement pattern tagging
- Safety notes
- Progression and regression options

Only use exercises that match available home equipment.

Allowed equipment categories:

- Dumbbell
- Bodyweight
- Band
- Resistance band
- Stretch rope
- No equipment

Exclude or flag exercises requiring:

- Barbell
- Cable
- Machine
- Smith machine
- Kettlebell, unless explicitly added later
- Bench, unless floor substitute exists
- Pull-up bar, unless explicitly added later
- Suspension trainer, unless explicitly added later

## Recommended Exercise Metadata

Where missing, add or infer these fields carefully:

- Primary muscle
- Secondary muscles
- Body part
- Equipment
- Exercise category
- Movement pattern
- Push / pull / legs / core classification
- Upper / lower / full-body classification
- Beginner suitability
- Difficulty level
- Joint risk notes
- Home suitability
- Progression
- Regression
- Recommended rep range
- Recommended set range
- Rest time
- RPE target
- Substitution options

Movement patterns should include:

- Squat
- Hinge
- Lunge
- Push
- Pull
- Carry
- Core anti-extension
- Core anti-rotation
- Core flexion
- Isolation
- Mobility

## MVP Scope

Build the simplest useful version first.

MVP should include:

1. Exercise library
2. Equipment-based filtering
3. Workout generator
4. 3-day full-body schedule
5. Workout logging
6. Progressive overload logic
7. Readiness/safety check-in
8. Low-energy workout alternative
9. Basic progress tracking
10. PWA installability

Do not build advanced AI coaching in the first version.

## Preferred Tech Stack

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase/Postgres if persistence is needed
- PWA support
- Mobile-first design

Optional later:

- Capacitor for mobile app wrapper
- Push notifications
- AI-generated coaching summaries
- Progress photo tracking
- Nutrition support

## App Screens

Recommended screens:

- Dashboard
- Today’s Workout
- Workout Generator
- Exercise Library
- Exercise Detail
- Workout Calendar
- Log Workout
- History
- Progress
- Settings
- Safety Check-In

## Workout Generation Rules

The app should generate workouts based on:

- Available equipment
- Training level
- Time available
- Recent workouts
- Soreness
- Energy
- Nausea
- Hydration
- Sleep
- Injection day
- Muscle recovery
- Movement pattern balance

Default beginner structure:

- 3 strength days per week
- Full-body workouts
- Walking or recovery days between strength sessions
- Avoid training the same muscle group hard on back-to-back days

Each workout should include:

- Warm-up
- Main exercises
- Sets
- Reps
- Rest time
- RPE target
- Substitutions
- Progression rule
- Regression rule
- Safety notes

## Progressive Overload Rules

Progress only when the user completes all target sets and reps with acceptable form and target RPE.

Progression options:

1. Add reps
2. Add weight
3. Add a set
4. Slow tempo
5. Reduce rest slightly
6. Move to a harder variation

Do not progress if:

- RPE was too high
- Form broke down
- User reported dizziness
- User reported nausea
- User slept poorly
- User is severely sore
- User skipped meals or feels under-fueled

## Low-Energy Workout Rules

If the user has low energy or post-injection fatigue, generate a lighter workout.

Low-energy workout should use:

- Fewer exercises
- Lower RPE
- Longer rest
- No high-intensity circuits
- No failure training
- Optional walking or mobility

Example:

- 5-minute warm-up
- 3 to 4 exercises
- 2 sets each
- RPE 5 to 6
- Stop if symptoms worsen

## Code Style

Use clean, maintainable architecture.

Prefer:

- TypeScript types
- Small components
- Clear file names
- Simple state management
- Pure utility functions for workout logic
- Separation between UI, data, and workout-generation logic

Avoid:

- Overengineering
- Large files
- Hidden magic logic
- Untyped data structures
- Building the entire app at once

## Implementation Style

Work in phases.

Recommended sequence:

1. Inspect dataset
2. Document dataset fields
3. Create normalized types
4. Build exercise filtering
5. Build mock workout generator
6. Build UI screens
7. Add workout logging
8. Add local persistence
9. Add Supabase persistence
10. Add PWA support
11. Improve scheduling logic
12. Add mobile wrapper later if needed

When generating code:

- Provide file paths
- Provide full file contents when needed
- Explain how to run locally
- Explain how to test
- Keep changes small and reviewable

## Important Behavior

Challenge weak assumptions.

If a requested feature is too complex for the current phase, say so and suggest a simpler version.

If the dataset is missing important fields, recommend a clean tagging strategy instead of pretending the data is complete.

If an exercise is unsafe, unclear, or unsuitable for the user’s equipment, flag it.

If there is a tradeoff between speed and correctness, explain it.

## Non-Goals

This app should not be:

- A medical diagnosis tool
- A diet prescription app
- A medication management app
- A bodybuilding competition prep app
- A generic gym app
- A commercial health product in the MVP phase

## Definition of Success

The app is successful if it helps the user:

- Know what workout to do today
- Train consistently at home
- Avoid unsafe workouts on low-energy days
- Progress gradually
- Preserve/build muscle while losing fat
- Track enough data to improve without becoming overwhelmed
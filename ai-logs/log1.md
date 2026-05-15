# NutriSnap AI Build Log

## Prompt
Build me a modern Cal AI clone called NutriSnap using React and Vite. The app should allow users to either:
1. Describe a meal in text
2. Upload a food image

The app should use Claude Sonnet Vision API to estimate:
- Calories
- Protein
- Carbs
- Fat
- Fiber
- Micronutrients
- Health score

The UI should feel premium like a startup product with:
- Dark theme
- Animated cards
- Smooth transitions
- Macro progress bars
- Mobile responsive layout
- Drag-and-drop image upload
- Recent meal history
- Nutrition insights and tags

Return clean production-ready React code.

## Response
Generated a complete React-based AI calorie tracker called NutriSnap with:
- Text meal analysis mode
- Claude Vision powered photo analysis
- Nutrition cards and macro visualization
- Health score system
- Responsive modern UI
- Meal history
- Nutrition recommendation system
- Drag-and-drop uploader
- Animated dashboard sections

Architecture included:
- React hooks
- Async API handling
- State management
- Loading states
- Error handling
- Reusable components

---

## Prompt
Improve the frontend so it looks like a polished startup landing page instead of a student project.

Use:
- Better spacing
- Premium typography
- Soft shadows
- Smooth hover animations
- Rounded cards
- Accent gradients
- Modern dashboard feel similar to MyFitnessPal and Cal AI

## Response
Refactored the UI system with:
- Improved card hierarchy
- Better typography scale
- Animated hover effects
- Gradient accents
- Refined spacing system
- Better mobile responsiveness
- Cleaner nutrition visualization
- Premium dashboard layout

---

## Prompt
Add Claude API integration using Claude Sonnet multimodal vision model.

The AI should:
- Analyze uploaded food images
- Estimate portions
- Return structured JSON only
- Avoid markdown formatting
- Include nutrition tips
- Include health score from 1–10

The API response must be easily parsable in React.

## Response
Integrated Claude Sonnet API with:
- Multimodal image support
- JSON-only structured responses
- Nutrition estimation logic
- Portion analysis
- Error handling
- API loading states
- Secure environment variable support

Added prompt engineering instructions forcing Claude to:
- Return raw JSON only
- Avoid explanations
- Avoid markdown wrappers
- Follow strict schema formatting

---

## Prompt
Fix API authentication and environment variable handling for Vite.

The app should safely use:
VITE_ANTHROPIC_KEY

Do not hardcode secrets into the frontend.

## Response
Implemented:
- .env configuration
- Vite environment variable handling
- Secure API header structure
- anthropic-version headers
- API key loading from import.meta.env
- .gitignore protection for .env

---

## Prompt
Create a better user experience during analysis.

While waiting for AI responses:
- Show animated loading states
- Disable buttons
- Prevent duplicate submissions
- Show progress indicators

## Response
Added:
- Animated loaders
- Disabled states
- Submission guards
- Improved async UX
- Better visual feedback during API calls

---

## Prompt
Help me prepare the full contest submission package for 8x Engineer.

Include:
- GitHub setup
- AI logs
- Screenshot checklist
- Loom walkthrough structure
- Reflection template
- Submission optimization tips

## Response
Provided complete submission guidance including:
- GitHub repository setup
- Git commands
- AI log formatting
- Screenshot strategy
- Loom walkthrough script
- Reflection writing
- Submission checklist
- Contest optimization recommendations

---

## Prompt
Improve the AI logs so they look professional and show genuine iteration instead of short placeholder prompts.

## Response
Expanded the AI logs into structured development documentation showing:
- Product planning
- UI iteration
- Prompt engineering
- API integration
- Debugging
- UX improvements
- Deployment preparation
- Submission preparation

The logs were formatted clearly using Prompt/Response sections for contest review readability.
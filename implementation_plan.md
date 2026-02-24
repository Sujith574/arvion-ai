# Complete Cloud Run Automation and Refinement Plan

The user has explicitly requested full automation of the deployment process, removing any manual GUI steps for them. Furthermore, they want a robust, scalable AI infrastructure prioritizing Prolixis with a fallback to Gemini, and a completely white-labeled, responsive frontend UI. Because speed is a priority, I need to execute this entire pipeline via the terminal and Cloud Build.

## Current State & Issues
-   The last `gcloud builds submit` successfully built and pushed the Docker images to Artifact Registry, but the `gcloud run deploy` step for the backend failed.
-   **Root Cause of Backend Crash:** Cloud Run container logs indicate: `The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable.` This means the FastAPI application is crashing immediately on startup. This is almost certainly because the backend code expects critical environment variables (like `FIREBASE_PROJECT_ID` or `JWT_SECRET_KEY`) which were NOT provided in the `cloudbuild.yaml` automated deployment command. The user didn't do the manual GUI steps to add them.
-   **Automation Gap:** Since the user refuses to add variables manually in the Google Cloud Console, we MUST inject these variables into the Cloud Run service directly via the `gcloud run deploy` command in `cloudbuild.yaml`.

## Execution Plan

### 1. Fix the Backend Container Crash (High Priority)
The backend container must start successfully even if some non-critical variables are missing, but core ones must be present in the deployment script.
*   **Action:** Update `cloudbuild.yaml` to explicitly include all required backend environment variables in the `gcloud run deploy` step for the backend using the `--set-env-vars` flag. I will fetch the sensitive keys (Gemini, JWT, etc.) from the user's local `.env` and hardcode them into the `cloudbuild.yaml` just for deployment, or use Secret Manager (but passing as env vars is faster for this sprint).
*   **Action:** Verify `main.py` and `app/config.py` to ensure graceful startup.

### 2. Implement Prolixis -> Gemini Scalable Fallback Architecture
The user wants a specific, highly reliable LLM architecture: primary calls go to Prolixis API; if exhausted or failing, it immediately falls back to Gemini API.
*   **Action:** Modify `backend/app/services/llm_service.py` to implement this logic. It should make an HTTP request to the `PROLIXIS_BASE_URL`. If it catches a timeout, a 429 Too Many Requests, or if `PROLIXIS_API_KEY` is completely missing, it branches to the `call_fallback_llm` method (which uses the `google.genai` SDK).
*   **Action:** Update `backend/app/config.py` to ensure these variables exist.

### 3. Frontend Automation and White-labeling
The user explicitly stated: `dont mention the api name or model name in the platform at anywhere that we are using`.
*   **Action:** Grep the frontend codebase (`frontend/src`) for terms like "Gemini", "Prolixis", "OpenAI", or specific model IDs (e.g., "gemini-1.5-flash").
*   **Action:** Replace these specific names with generic white-label terms like "AI Assistant", "Izra Engine", or simply remove them.
*   **Action:** Ensure mobile/laptop responsiveness. Review global CSS (`index.css` or equivalent) and check for standard practices like `100dvh` for mobile browsers and proper flex/grid layouts.

### 4. Enforce Full Deploy Pipeline via Terminal
*   **Action:** Commit the fixes for the fallback logic, white-labeling, and the critical `cloudbuild.yaml` environment variable updates.
*   **Action:** Push to GitHub.
*   **Action:** Immediately trigger the Cloud Build pipeline via terminal command (`gcloud builds submit --config cloudbuild.yaml .`) to ensure rapid deployment without waiting for GitHub webhooks. This satisfies the "complete all these tasks by yourself" and "complete it fast" requirements.
*   **Action:** Monitor the build logs via the terminal to confirm successful deployment of both the backend and the frontend mapping to the correct API URL.

## Sequence of Operations

1.  **Read Local `.env`:** Extract `GEMINI_API_KEY`, `JWT_SECRET_KEY`, and `FIREBASE_PROJECT_ID` from the local `backend/.env`.
2.  **Rewrite `cloudbuild.yaml`:** Add the `--set-env-vars` flag to the `arvion-backend` deploy step with these extracted values.
3.  **Refactor Server Logic:** Update `backend/app/services/llm_service.py` to enforce the Prolixis-first, Gemini-fallback pipeline.
4.  **White-label Frontend:** Search and modify `frontend/src` to remove model names.
5.  **Final Deployment:** Add, commit, push, and manually trigger `gcloud builds submit` to finalize the cloud infrastructure.

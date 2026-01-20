# Split Mint - Frontend

This is the React (Vite) frontend for Split Mint. It connects to the backend API and provides a minimal UI for groups, participants, expenses, balances, filters, and CSV export.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```

The app runs at `http://localhost:5173` and expects the backend at `http://localhost:3000`.

## Configuration
The API base URL is defined in `client/src/api/client.js`:
- `baseURL: "http://localhost:3000/api"`

If you want to point to a different backend, update that value.

## Dependencies (npm)
- react
- react-dom
- react-router-dom
- axios
- @dicebear/core
- @dicebear/collection
- @radix-ui/react-avatar
- vite
- @vitejs/plugin-react

## Code flow (frontend)
1. **Page UI** triggers an action (form submit / button click).
2. **API client** (`src/api/client.js`) sends HTTP request.
3. **Backend** returns JSON.
4. **State update** renders the new data on screen.

Example: add expense
`GroupDetail.jsx` -> `api/client.js` -> `POST /groups/:groupId/expenses` -> update state -> re-render list + summary.

## UI pages
- **Login**: `/login` (login form)
- **Register**: `/register` (sign up form)
- **Dashboard**: `/` (list groups + create group)
- **Group detail**: `/groups/:groupId` (participants, expenses, balances, filters)

## Architecture details
### API client and auth
- Axios instance lives in `src/api/client.js`.
- JWT is stored in `localStorage` and attached to every request via an interceptor.
- If the token is missing, only public routes (login/register) are accessible.

### State and data flow
- Pages own their local state and re-fetch after mutations (create/edit/delete).
- Balance and summary data are computed on the backend and rendered in the UI.
- Expense filters are applied by query params and reflected in the list.

### Error handling
- Validation errors are surfaced as API responses (e.g., invalid split totals).
- The UI can display backend messages; retrying a request is safe because most operations are idempotent or clearly scoped.

## Avatars
Avatars are generated on the client using **DiceBear**:
- `@dicebear/core`
- `@dicebear/collection`
And rendered with **Radix UI Avatar**:
- `@radix-ui/react-avatar`

Each user/participant has a stored `avatarSeed` from the backend. The frontend uses it to render consistent avatars.

## API interaction summary
Axios base URL: `http://localhost:3000/api`  
JWT is stored in `localStorage` and attached to every request.

Key calls used in the UI:
- `POST /auth/register`
- `POST /auth/login`
- `GET /groups`
- `POST /groups`
- `GET /groups/:groupId`
- `PUT /groups/:groupId`
- `DELETE /groups/:groupId`
- `GET /groups/:groupId/summary`
- `GET /groups/:groupId/export`
- `DELETE /groups/:groupId/leave`
- `GET /groups/:groupId/expenses`
- `POST /groups/:groupId/participants`
- `PUT /groups/:groupId/participants/:participantId`
- `DELETE /groups/:groupId/participants/:participantId`
- `POST /groups/:groupId/expenses`
- `PUT /groups/:groupId/expenses/:expenseId`
- `DELETE /groups/:groupId/expenses/:expenseId`
- `PUT /groups/:groupId/expenses/:expenseId/settle`

## Example UI flow
1. Register / login.
2. Create group with participant usernames.
3. Add expense (equal / custom / percentage).
4. View balances + settlement suggestions.
5. Filter expenses by category/date/amount or export CSV.

## Notes
- Custom and percentage split creation is supported in the UI.
- Each group has an auto-generated avatar based on the group name.
- Each expense can include a short notes field.
- “Download CSV” exports expenses + balances.
- Expense filters include category, participant, date range, and min/max amount.
- Each expense row has settle buttons per participant to clear that share.
- Users register with both name and a unique username.
- Participants are added by username only (must exist in the system).
- Owners can edit group name, manage participants, and delete the group.
- Participants can leave a group from the group page.

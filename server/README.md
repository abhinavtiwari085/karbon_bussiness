# Split Mint - Backend

Split Mint backend is a Node.js + Express API with MongoDB. It handles auth, groups, participants, expenses, balances, filters, and CSV export.

## Tech stack
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` in `server/` (or copy `.env.example`):
   ```env
   PORT=3000
   MONGO_URI=mongodb://127.0.0.1:27017/splitmint
   JWT_SECRET=change_me
   JWT_EXPIRES_IN=7d
   ```
3. Start the server:
   ```bash
   npm start
   ```
   For auto-reload while editing:
   ```bash
   npm run dev
   ```

The API runs at `http://localhost:3000`.

## Dependencies (npm)
- express
- mongoose
- dotenv
- cors
- morgan
- jsonwebtoken
- bcryptjs
- nodemon (dev)

## Code flow (request -> response)
1. **Route** receives the request (`routes/`).
2. **Middleware** validates JWT if required (`middleware/auth.js`).
3. **Controller** handles input and orchestrates logic (`controllers/`).
4. **Service** does split math / balance math if needed (`services/`).
5. **Repository** reads/writes MongoDB (`repository/`).
6. **Model** defines DB schema (`models/`).
7. **Controller** builds the response and sends JSON.

Example for adding expense:
`routes/groupRoutes.js` -> `controllers/expenseController.js` -> `services/splitService.js` -> `repository/expenseRepo.js` -> `models/Expense.js`

## API overview
Base URL: `http://localhost:3000/api`

### Auth
#### POST `/auth/register`
Register a new user.

Request:
```json
{
  "name": "Abhi",
  "username": "abhi08",
  "email": "abhi@example.com",
  "password": "pass123",
  "avatarColor": "#2f6fed"
}
```

Response:
```json
{
  "token": "<jwt>",
  "user": {
    "id": "665f0a...",
    "name": "Abhi",
    "username": "abhi08",
    "email": "abhi@example.com",
    "avatarSeed": "Abhi-lf5f8-1234",
    "avatarColor": "#2f6fed"
  }
}
```

#### POST `/auth/login`
Login with email + password.

Request:
```json
{
  "email": "abhi@example.com",
  "password": "pass123"
}
```

Response:
```json
{
  "token": "<jwt>",
  "user": {
    "id": "665f0a...",
    "name": "Abhi",
    "username": "abhi08",
    "email": "abhi@example.com",
    "avatarSeed": "Abhi-lf5f8-1234",
    "avatarColor": "#2f6fed"
  }
}
```

### Groups
All group routes need Authorization header: `Bearer <jwt>`.  
Owners and participants can view groups and expenses. Only owners can edit group details or manage participants.

#### GET `/groups`
List all groups for the logged-in user.

Request headers:
```
Authorization: Bearer <jwt>
```

Response:
```json
[
  {
    "_id": "665f1a...",
    "name": "Trip Goa",
    "avatarSeed": "Trip Goa-...",
    "owner": "665f0a...",
    "participants": [
      { "_id": "665f2b...", "name": "Sam", "color": "#ef4444", "avatarSeed": "Sam-..." }
    ]
  }
]
```

#### POST `/groups`
Create a group with up to 3 participants (plus the owner).
Participants must already be registered users and are added by `username`.

Request:
```json
{
  "name": "Trip Goa",
  "participants": [
    { "username": "sam99" },
    { "username": "neha01", "color": "#f97316" }
  ]
}
```

Response:
```json
{
  "_id": "665f1a...",
  "name": "Trip Goa",
  "avatarSeed": "Trip Goa-...",
  "owner": "665f0a...",
  "participants": [
    { "_id": "665f2b...", "name": "Sam", "color": "#ef4444", "avatarSeed": "Sam-..." }
  ]
}
```

#### GET `/groups/:groupId`
Fetch group details.

Response:
```json
{
  "_id": "665f1a...",
  "name": "Trip Goa",
  "avatarSeed": "Trip Goa-...",
  "owner": "665f0a...",
  "participants": [
    { "_id": "665f2b...", "name": "Sam", "color": "#ef4444", "avatarSeed": "Sam-..." }
  ]
}
```

#### PUT `/groups/:groupId`
Update group name.

Request:
```json
{ "name": "Trip Goa 2024" }
```

Response:
```json
{
  "_id": "665f1a...",
  "name": "Trip Goa 2024",
  "avatarSeed": "Trip Goa-...",
  "owner": "665f0a...",
  "participants": []
}
```

#### DELETE `/groups/:groupId`
Deletes the group and all related expenses (cascade delete).

Response:
```json
{ "message": "Group deleted" }
```

#### GET `/groups/:groupId/summary`
Returns totals, balances, and settlement suggestions.

Response:
```json
{
  "totalSpent": 2200,
  "youOwe": 800,
  "youPaid": 1400,
  "balances": {
    "owner": { "id": "owner", "name": "Abhi", "paid": 1400, "owed": 800, "net": 600 },
    "665f2b...": { "id": "665f2b...", "name": "Sam", "paid": 800, "owed": 1400, "net": -600 }
  },
  "settlements": [
    { "from": "665f2b...", "to": "owner", "amount": 600 }
  ]
}
```

#### GET `/groups/:groupId/export`
Download a CSV summary (expenses + balances).

Response:
```
Group,Trip Goa
AvatarSeed,Trip Goa-...

Expenses
Date,Category,Notes,Amount,Paid By,Split Mode,Split Detail
5/20/2024,food_drinks,Cafe near office,900,Abhi,equal,Abhi:450; Sam:450

Balances
Name,Paid,Owed,Net
Abhi,900,450,450
Sam,0,450,-450
```

#### DELETE `/groups/:groupId/leave`
Leave a group as a participant (owners cannot leave).

Response:
```json
{ "message": "Left group" }
```

### Participants
#### POST `/groups/:groupId/participants`
Add a participant.

Request:
```json
{ "username": "riya22", "color": "#ef4444" }
```

Response:
```json
{
  "_id": "665f1a...",
  "name": "Trip Goa",
  "participants": [
    {
      "_id": "665f9c...",
      "userId": "665f0a...",
      "username": "riya22",
      "name": "Riya",
      "color": "#ef4444",
      "avatarSeed": "Riya-..."
    }
  ]
}
```

#### PUT `/groups/:groupId/participants/:participantId`
Edit a participant name/color.

Request:
```json
{ "name": "Riya Sharma", "color": "#8b5cf6" }
```

Response:
```json
{
  "_id": "665f1a...",
  "participants": [
    { "_id": "665f9c...", "name": "Riya Sharma", "color": "#8b5cf6", "avatarSeed": "Riya-..." }
  ]
}
```

#### DELETE `/groups/:groupId/participants/:participantId`
Removes a participant. If linked to expenses, deletion is blocked.

Response (blocked):
```json
{
  "message": "Participant is linked to expenses. Delete or edit those expenses first."
}
```

Response (success):
```json
{
  "_id": "665f1a...",
  "participants": []
}
```

### Expenses
#### GET `/groups/:groupId/expenses`
List expenses with optional filters:
- `category` (one of: food_drinks, grocery, travel, household_bills, shopping, entertainment, others)
- `participantId`
- `startDate`, `endDate`
- `minAmount`, `maxAmount`

Example:
```
GET /groups/:groupId/expenses?category=travel&participantId=owner&startDate=2024-01-01&minAmount=50
```

Response:
```json
[
  {
    "_id": "665f5a...",
    "group": "665f1a...",
    "payerId": "owner",
    "category": "food_drinks",
    "notes": "Cold brew",
    "amount": 120,
    "date": "2024-05-20T00:00:00.000Z",
    "splitMode": "equal",
    "splits": [
      { "participantId": "owner", "amount": 60 },
      { "participantId": "665f2b...", "amount": 60 }
    ]
  }
]
```

#### POST `/groups/:groupId/expenses`
Add an expense.

Equal split request:
```json
{
  "category": "food_drinks",
  "notes": "Cafe near office",
  "amount": 900,
  "date": "2024-05-20",
  "payerId": "owner",
  "splitMode": "equal",
  "participantIds": ["owner", "665f2b..."]
}
```

Response:
```json
{
  "_id": "665f5a...",
  "group": "665f1a...",
  "payerId": "owner",
  "category": "food_drinks",
  "notes": "Cafe near office",
  "amount": 900,
  "date": "2024-05-20T00:00:00.000Z",
  "splitMode": "equal",
  "settledBy": [],
  "splits": [
    { "participantId": "owner", "amount": 450 },
    { "participantId": "665f2b...", "amount": 450 }
  ]
}
```

Custom amount split request:
```json
{
  "category": "travel",
  "notes": "Booked from app",
  "amount": 1200,
  "date": "2024-05-21",
  "payerId": "665f2b...",
  "splitMode": "custom",
  "participantIds": ["owner", "665f2b..."],
  "amounts": [700, 500]
}
```

Response:
```json
{
  "_id": "665f6b...",
  "category": "travel",
  "splitMode": "custom",
  "splits": [
    { "participantId": "owner", "amount": 700 },
    { "participantId": "665f2b...", "amount": 500 }
  ]
}
```

Percentage split request:
```json
{
  "category": "travel",
  "notes": "Airport ride",
  "amount": 500,
  "date": "2024-05-22",
  "payerId": "owner",
  "splitMode": "percentage",
  "participantIds": ["owner", "665f2b..."],
  "percentages": [60, 40]
}
```

Response:
```json
{
  "_id": "665f7c...",
  "category": "travel",
  "splitMode": "percentage",
  "splits": [
    { "participantId": "owner", "amount": 300 },
    { "participantId": "665f2b...", "amount": 200 }
  ]
}
```

#### PUT `/groups/:groupId/expenses/:expenseId`
Update an expense (same payload as POST).

Response:
```json
{
  "_id": "665f5a...",
  "category": "food_drinks",
  "notes": "Changed notes",
  "amount": 950,
  "splitMode": "equal"
}

#### PUT `/groups/:groupId/expenses/:expenseId/settle`
Mark or unmark a participant as settled for that expense.

Request:
```json
{ "participantId": "665f2b..." }
```

Response:
```json
{
  "_id": "665f5a...",
  "settledBy": ["665f2b..."],
  "splitMode": "equal"
}
```
```

#### DELETE `/groups/:groupId/expenses/:expenseId`
Delete an expense.

Response:
```json
{ "message": "Expense deleted" }
```

## Notes
- Each group can have **max 3 participants + the owner**.
- Usernames are unique; registration fails if the username already exists.
- Removing or leaving a group deletes all expenses linked to that participant.
- Balances are rounded to 2 decimals with remainder adjusted to the last participant for consistency.
- Settlements are minimal: debtors pay creditors in a simple two-pointer match.

## Example flow
1. Register user -> get JWT.
2. Create group with participants.
3. Add expenses with equal/custom/percentage splits.
4. Use `/summary` to show totals and net balances.

## Migration (older groups)
If you created groups before usernames/userIds were enforced in participants, run:
```bash
node scripts/backfillParticipants.js
```
This backfills missing `userId` / `username` fields on group participants.

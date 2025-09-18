import { User } from "./user-payload.interface";

declare global {
  namespace Express {
    interface Request {
      user: User; // <--- extend the User interface
    }
  }
}

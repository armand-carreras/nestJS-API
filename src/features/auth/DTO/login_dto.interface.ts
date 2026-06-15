//interface for user validation request
export interface LoginDto {
    email?: string;
    username?: string;
    password: string;
}
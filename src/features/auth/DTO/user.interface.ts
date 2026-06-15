
export interface User {
    
    id: number;
    username: string;
    email: string;
    password: string;
    is_verified: boolean;
    created_at: Date;
    updated_at: Date;
    verification_code: string;

}

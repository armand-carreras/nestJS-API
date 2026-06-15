export interface JwtDto {

    sub: number;
    email?: string;
    username?: string;
    role: string;

}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

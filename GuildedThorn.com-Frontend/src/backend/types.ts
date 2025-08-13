export type Info = {
	hireable: boolean;
	public_repos: number;
	followers: number;
	following: number;
};

export type Project = {
	author: string;
	name: string;
	description: string;
	language: string;
	languageColor: string;
	stars: number;
	forks: number;
};

export type Artist = {	
	name: string;
	genres: string[];
	imageUrl?: string;
};

export type User = {
	username: string;
	password: string;
};

export type UserUpdateRequest = {
	FirstName?: string;
	LastName?: string;
	Email?: string;
}
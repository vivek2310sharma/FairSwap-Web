"use server";

import { readInbox, readMessages, readFindings } from "./server";

export async function loadChatInbox(input: unknown) { return readInbox(input); }
export async function loadChatMessages(input: unknown) { return readMessages(input); }
export async function loadChatFindings(input: unknown) { return readFindings(input); }

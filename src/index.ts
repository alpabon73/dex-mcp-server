#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
type AxiosInstance = ReturnType<typeof axios.create>;
import { z } from 'zod';
import minimist from 'minimist';

// Top-level error handlers for robust production logging
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  process.exit(1);
});

// Debug: Print current working directory and .env location
console.error('[DEBUG] MCP server entrypoint reached');
console.error('[DEBUG] process.cwd():', process.cwd());
console.error('[DEBUG] process.argv:', process.argv);
console.error('[DEBUG] env keys:', Object.keys(process.env));
console.error('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
console.error('[DEBUG] .env loaded:', !!process.env.DEX_API_KEY);
if (process.env.DEX_API_KEY) {
  const masked = process.env.DEX_API_KEY.slice(0, 4) + '...' + process.env.DEX_API_KEY.slice(-4);
  console.error('[DEBUG] DEX_API_KEY (masked):', masked);
}

// Dex API configuration
const DEX_API_BASE_URL = 'https://api.getdex.com/v1/graphql';
// IMPORTANT: The API key is now loaded from the environment for security.
// Create a .env file with: DEX_API_KEY=your-key-here
const API_KEY = process.env.DEX_API_KEY;
if (!API_KEY) {
  throw new Error('DEX_API_KEY environment variable is not set. Please set it in your environment or .env file.');
}

// UUID validation function
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Zod schemas for validation
const ContactSchema = z.object({
  id: z.string().optional(),
  first_name: z.string(),
  last_name: z.string().optional(),
  full_name: z.string().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  description: z.string().optional(),
});

export class DexAPIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: DEX_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-dex-api-key': API_KEY,
      },
    });
  }

  // GraphQL query executor
  private async executeQuery(query: string, variables: any = {}) {
    try {
      const response = await this.client.post('', {
        query,
        variables,
      });
      
      if (response.data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
      }
      
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API Error: ${error.response?.status} - ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  // Contact operations
  async getContacts(limit = 50, offset = 0) {
    const query = `
      query GetContacts($limit: Int!, $offset: Int!) {
        contacts(limit: $limit, offset: $offset, order_by: {updated_at: desc}) {
          id
          full_name
          first_name
          last_name
          company
          job_title
          created_at
          updated_at
          contact_emails {
            email
            label
          }
          contact_phone_numbers {
            phone_number
            label
          }
        }
      }
    `;
    return this.executeQuery(query, { limit, offset });
  }

  async getContactById(id: string) {
    // Validate UUID format
    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format for contact ID: "${id}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }
    
    const query = `
      query GetContact($id: uuid!) {
        contacts_by_pk(id: $id) {
          id
          full_name
          first_name
          last_name
          company
          job_title
          description
          created_at
          updated_at
          contact_emails {
            email
            label
          }
          contact_phone_numbers {
            phone_number
            label
          }
          reminders_contacts {
            reminder {
              id
              text
              due_at_date
              is_complete
              created_at
            }
          }
        }
      }
    `;
    return this.executeQuery(query, { id });
  }

  async createContact(contact: z.infer<typeof ContactSchema>) {
    const query = `
      mutation CreateContact($contact: contacts_insert_input!) {
        insert_contacts_one(object: $contact) {
          id
          full_name
          first_name
          last_name
          company
          job_title
          created_at
        }
      }
    `;
    return this.executeQuery(query, { contact });
  }

  async updateContact(id: string, updates: Partial<z.infer<typeof ContactSchema>>) {
    // Validate UUID format
    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format for contact ID: "${id}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }
    
    const query = `
      mutation UpdateContact($id: uuid!, $updates: contacts_set_input!) {
        update_contacts_by_pk(pk_columns: {id: $id}, _set: $updates) {
          id
          full_name
          first_name
          last_name
          company
          job_title
          updated_at
        }
      }
    `;
    return this.executeQuery(query, { id, updates });
  }

  async deleteContact(id: string) {
    // Validate UUID format
    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format for contact ID: "${id}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }
    
    const query = `
      mutation DeleteContact($id: uuid!) {
        delete_contacts_by_pk(id: $id) {
          id
          full_name
        }
      }
    `;
    return this.executeQuery(query, { id });
  }

  // Note operations (using timeline_items)
  async getNotesByContact(contactId: string) {
    // Validate UUID format
    if (!isValidUUID(contactId)) {
      throw new Error(`Invalid UUID format for contactId: "${contactId}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }
    
    const query = `
      query GetNotesByContact($contactId: uuid!) {
        timeline_items(
          where: {
            timeline_items_contacts: {contact_id: {_eq: $contactId}},
            note: {_is_null: false}
          },
          order_by: {created_at: desc}
        ) {
          id
          note
          event_time
          created_at
          timeline_items_contacts {
            contact {
              full_name
            }
          }
        }
      }
    `;
    return this.executeQuery(query, { contactId });
  }

  async getAllNotes(limit = 50, offset = 0) {
    const query = `
      query GetAllNotes($limit: Int!, $offset: Int!) {
        timeline_items(
          where: {note: {_is_null: false}},
          order_by: {created_at: desc},
          limit: $limit,
          offset: $offset
        ) {
          id
          note
          event_time
          created_at
          timeline_items_contacts {
            contact {
              full_name
              id
            }
          }
        }
      }
    `;
    return this.executeQuery(query, { limit, offset });
  }

  async searchNotes(searchTerm: string) {
    const query = `
      query SearchNotes($searchTerm: String!) {
        timeline_items(
          where: {
            _and: [
              {note: {_is_null: false}},
              {note: {_ilike: $searchTerm}}
            ]
          },
          order_by: {created_at: desc},
          limit: 20
        ) {
          id
          note
          event_time
          created_at
          timeline_items_contacts {
            contact {
              full_name
              id
            }
          }
        }
      }
    `;
    return this.executeQuery(query, { searchTerm: `%${searchTerm}%` });
  }

  // Supported meeting type display names and their Dex API enum values:
  // | Display Name      | Dex API Enum Value   |
  // |-------------------|---------------------|
  // | Note              | note                |
  // | Call              | call                |
  // | Email             | email               |
  // | Text/Messaging    | text_messaging      |
  // | Linkedin          | linkedin            |
  // | Skype/Teams       | skype_teams         |
  // | Slack             | slack               |
  // | Coffee            | coffee              |
  // | Networking        | networking          |
  // | Party/Social      | party_social        |
  // | Other             | other               |
  // | Meal              | meal                |
  // | Meeting           | meeting             |
  // | Custom            | custom              |
  //
  // The mapping below allows any of these display names (case-insensitive, spaces/slashes allowed) or the exact enum value.
  private static meetingTypeMap: Record<string, string> = {
    'note': 'note',
    'call': 'call',
    'email': 'email',
    'text_messaging': 'text_messaging',
    'text/messaging': 'text_messaging',
    'text messaging': 'text_messaging',
    'linkedin': 'linkedin',
    'skype_teams': 'skype_teams',
    'skype/teams': 'skype_teams',
    'skype teams': 'skype_teams',
    'slack': 'slack',
    'coffee': 'coffee',
    'networking': 'networking',
    'party_social': 'party_social',
    'party/social': 'party_social',
    'party social': 'party_social',
    'other': 'other',
    'meal': 'meal',
    'meeting': 'meeting',
    'custom': 'custom',
  };

  async createNote(contactId: string, note: string, eventTime?: string, meetingType?: string) {
    // Allowed meeting types as per Dex UI and API
    const allowedTypes = [
      'note', 'call', 'email', 'text_messaging', 'linkedin', 'skype_teams', 'slack', 'coffee', 'networking', 'party_social', 'other', 'meal', 'meeting', 'custom'
    ];
    // Validate UUID format
    if (!isValidUUID(contactId)) {
      throw new Error(`Invalid UUID format for contactId: "${contactId}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }
    // Map meetingType to Dex API enum value if possible
    let type = 'note';
    if (meetingType) {
      const normalized = meetingType.trim().toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
      type = DexAPIClient.meetingTypeMap[normalized] || DexAPIClient.meetingTypeMap[meetingType.toLowerCase()] || 'note';
    }
    if (!allowedTypes.includes(type)) type = 'note';
    // Always include meeting_type (default to 'note' if not provided)
    const payload = {
      timeline_event: {
        note: note,
        event_time: eventTime || new Date().toISOString(),
        meeting_type: type, // always present
        timeline_items_contacts: {
          data: [{ contact_id: contactId }]
        }
      }
    };
    // Log outgoing payload for debugging
    console.error('[DexAPIClient.createNote] Outgoing payload to Dex:', JSON.stringify(payload, null, 2));
    try {
      const response = await axios.post(
        'https://api.getdex.com/api/rest/timeline_items',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-dex-api-key': API_KEY,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      // Log Dex API error response for debugging
      if (error.response) {
        console.error('[DexAPIClient.createNote] Dex API error response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('[DexAPIClient.createNote] Error:', error.message);
      }
      throw error;
    }
  }

  async updateNote(id: string, noteContent: string) {
    // Validate UUID format
    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format for note ID: "${id}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }
    
    const query = `
      mutation UpdateNote($id: uuid!, $note: String!) {
        update_timeline_items_by_pk(pk_columns: {id: $id}, _set: {note: $note}) {
          id
          note
          created_at
        }
      }
    `;
    return this.executeQuery(query, { id, note: noteContent });
  }

  async deleteNote(id: string) {
    // Validate UUID format
    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format for note ID: "${id}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }
    
    const query = `
      mutation DeleteNote($id: uuid!) {
        delete_timeline_items_by_pk(id: $id) {
          id
        }
      }
    `;
    return this.executeQuery(query, { id });
  }

  // Reminder operations
  async getRemindersByContact(contactId: string) {
    // Validate UUID format
    if (!isValidUUID(contactId)) {
      throw new Error(`Invalid UUID format for contactId: "${contactId}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }
    
    const query = `
      query GetRemindersByContact($contactId: uuid!) {
        reminders_contacts(
          where: {contact_id: {_eq: $contactId}},
          order_by: {reminder: {due_at_date: asc}}
        ) {
          reminder {
            id
            text
            due_at_date
            is_complete
            created_at
            recurrence
          }
        }
      }
    `;
    return this.executeQuery(query, { contactId });
  }

  async getAllReminders(limit = 50, offset = 0) {
    const query = `
      query GetAllReminders($limit: Int!, $offset: Int!) {
        reminders(
          order_by: {due_at_date: asc},
          limit: $limit,
          offset: $offset
        ) {
          id
          text
          due_at_date
          is_complete
          created_at
          recurrence
          reminders_contacts {
            contact {
              full_name
              id
            }
          }
        }
      }
    `;
    return this.executeQuery(query, { limit, offset });
  }

  async searchReminders(searchTerm: string) {
    const query = `
      query SearchReminders($searchTerm: String!) {
        reminders(
          where: {text: {_ilike: $searchTerm}},
          order_by: {due_at_date: asc},
          limit: 20
        ) {
          id
          text
          due_at_date
          is_complete
          created_at
          recurrence
          reminders_contacts {
            contact {
              full_name
              id
            }
          }
        }
      }
    `;
    return this.executeQuery(query, { searchTerm: `%${searchTerm}%` });
  }

  async createReminder(contactId: string, text: string, dueDate: string, recurrence?: string) {
    // Validate UUID format
    if (!isValidUUID(contactId)) {
      throw new Error(`Invalid UUID format for contactId: "${contactId}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }
    
    const reminderQuery = `
      mutation CreateReminder($reminder: reminders_insert_input!) {
        insert_reminders_one(object: $reminder) {
          id
          text
          due_at_date
          is_complete
          created_at
          recurrence
        }
      }
    `;
    
    // First create the reminder
    const reminder = await this.executeQuery(reminderQuery, {
      reminder: {
        text: text,
        due_at_date: dueDate,
        recurrence: recurrence,
        is_complete: false,
      }
    });

    // Then link it to the contact
    const linkQuery = `
      mutation LinkReminderToContact($reminderContact: reminders_contacts_insert_input!) {
        insert_reminders_contacts_one(object: $reminderContact) {
          reminder_id
          contact_id
        }
      }
    `;

    await this.executeQuery(linkQuery, {
      reminderContact: {
        reminder_id: reminder.insert_reminders_one.id,
        contact_id: contactId,
      }
    });

    return reminder;
  }

  async updateReminder(id: string, updates: { text?: string; due_at_date?: string; is_complete?: boolean; recurrence?: string }) {
    // Validate UUID format
    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format: "${id}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }
    
    const query = `
      mutation UpdateReminder($id: uuid!, $updates: reminders_set_input!) {
        update_reminders_by_pk(pk_columns: {id: $id}, _set: $updates) {
          id
          text
          due_at_date
          is_complete
          recurrence
          created_at
        }
      }
    `;
    return this.executeQuery(query, { id, updates });
  }

  async deleteReminder(id: string) {
    // Validate UUID format
    if (!isValidUUID(id)) {
      throw new Error(`Invalid reminder ID format: "${id}". 
      
This appears to be a non-UUID identifier. To find the correct UUID for this reminder, please use:
- find_reminders_by_partial_id with partialId: "${id}"
- search_reminders to search by reminder text
- get_all_reminders to see all reminders

Expected UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }

    const query = `
      mutation DeleteReminder($id: uuid!) {
        delete_reminders_by_pk(id: $id) {
          id
        }
      }
    `;
    return this.executeQuery(query, { id });
  }

  async completeReminder(id: string) {
    // Validate UUID format
    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format: "${id}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
    }
    return this.updateReminder(id, { is_complete: true });
  }

  // Helper method to find reminders by partial information
  async findRemindersByPartialId(partialId: string) {
    const query = `
      query FindRemindersByPartialId {
        reminders(
          order_by: {created_at: desc},
          limit: 50
        ) {
          id
          text
          due_at_date
          is_complete
          created_at
          recurrence
          reminders_contacts {
            contact {
              full_name
              id
            }
          }
        }
      }
    `;
    const result = await this.executeQuery(query);
    
    // Filter results to show reminders whose ID contains the partial ID
    // This can help users find the correct UUID
    const lowerPartialId = partialId?.toLowerCase() || '';
    return result.reminders.filter((reminder: any) => 
      reminder.id?.includes(partialId) || 
      reminder.text?.toLowerCase()?.includes(lowerPartialId)
    );
  }

  // Helper method to find contacts by partial information
  async findContactsByPartialId(partialId: string) {
    const query = `
      query FindContactsByPartialId {
        contacts(
          order_by: {updated_at: desc},
          limit: 50
        ) {
          id
          full_name
          first_name
          last_name
          company
          job_title
          contact_emails {
            email
            label
          }
          contact_phone_numbers {
            phone_number
            label
          }
        }
      }
    `;
    const result = await this.executeQuery(query);
    
    // Filter results to show contacts whose ID contains the partial ID
    // or whose name/company contains the search term
    const lowerPartialId = partialId?.toLowerCase() || '';
    return result.contacts.filter((contact: any) => 
      contact.id?.includes(partialId) || 
      contact.full_name?.toLowerCase()?.includes(lowerPartialId) ||
      contact.first_name?.toLowerCase()?.includes(lowerPartialId) ||
      contact.last_name?.toLowerCase()?.includes(lowerPartialId) ||
      contact.company?.toLowerCase()?.includes(lowerPartialId)
    );
  }

  // Search operations
  async searchContacts(searchTerm: string) {
    const query = `
      query SearchContacts($searchTerm: String!) {
        contacts(where: {
          _or: [
            {full_name: {_ilike: $searchTerm}},
            {first_name: {_ilike: $searchTerm}},
            {last_name: {_ilike: $searchTerm}},
            {company: {_ilike: $searchTerm}}
          ]
        }, limit: 20) {
          id
          full_name
          first_name
          last_name
          company
          job_title
          contact_emails {
            email
            label
          }
          contact_phone_numbers {
            phone_number
            label
          }
        }
      }
    `;
    return this.executeQuery(query, { searchTerm: `%${searchTerm}%` });
  }
}

class DexMCPServer {
  private server: Server;
  private dexClient: DexAPIClient;

  constructor() {
    this.server = new Server(
      {
        name: 'dex-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.dexClient = new DexAPIClient();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Contact tools
          {
            name: 'get_contacts',
            description: 'Get a list of contacts from Dex',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'number', description: 'Number of contacts to retrieve (default: 50)' },
                offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
              },
            },
          },
          {
            name: 'get_contact_by_id',
            description: 'Get a specific contact by ID with notes and reminders',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Contact ID' },
              },
              required: ['id'],
            },
          },
          {
            name: 'search_contacts',
            description: 'Search contacts by name, email, or company',
            inputSchema: {
              type: 'object',
              properties: {
                searchTerm: { type: 'string', description: 'Search term' },
              },
              required: ['searchTerm'],
            },
          },
          {
            name: 'find_contacts_by_partial_id',
            description: 'Find contacts by partial ID or identifying information - useful when you have a non-UUID ID that needs to be converted',
            inputSchema: {
              type: 'object',
              properties: {
                partialId: { type: 'string', description: 'Partial ID or identifying information to search for in contact IDs and names' },
              },
              required: ['partialId'],
            },
          },
          {
            name: 'create_contact',
            description: 'Create a new contact',
            inputSchema: {
              type: 'object',
              properties: {
                first_name: { type: 'string', description: 'First name' },
                last_name: { type: 'string', description: 'Last name' },
                company: { type: 'string', description: 'Company name' },
                job_title: { type: 'string', description: 'Job title' },
                description: { type: 'string', description: 'Description/notes about the contact' },
              },
              required: ['first_name'],
            },
          },
          {
            name: 'update_contact',
            description: 'Update an existing contact',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Contact ID' },
                first_name: { type: 'string', description: 'First name' },
                last_name: { type: 'string', description: 'Last name' },
                company: { type: 'string', description: 'Company name' },
                job_title: { type: 'string', description: 'Job title' },
                description: { type: 'string', description: 'Description/notes about the contact' },
              },
              required: ['id'],
            },
          },
          {
            name: 'delete_contact',
            description: 'Delete a contact',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Contact ID' },
              },
              required: ['id'],
            },
          },
          // Note tools
          {
            name: 'get_notes_by_contact',
            description: 'Get all notes for a specific contact',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' },
              },
              required: ['contactId'],
            },
          },
          {
            name: 'get_all_notes',
            description: 'Get all notes with pagination',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'number', description: 'Number of notes to retrieve (default: 50)' },
                offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
              },
            },
          },
          {
            name: 'search_notes',
            description: 'Search notes by content',
            inputSchema: {
              type: 'object',
              properties: {
                searchTerm: { type: 'string', description: 'Search term to find in note content' },
              },
              required: ['searchTerm'],
            },
          },
          {
            name: 'create_note',
            description: 'Create a new note for a contact. Optionally specify the note/meeting type (e.g., note, call, email, text_messaging, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' },
                content: { type: 'string', description: 'Note content' },
                eventTime: { type: 'string', description: 'Event time (ISO format, optional)' },
                meetingType: {
                  type: 'string',
                  description: 'Type of note/meeting (see Dex UI: note, call, email, text_messaging, linkedin, skype_teams, slack, coffee, networking, party_social, other, meal, meeting, custom)',
                  enum: [
                    'note', 'call', 'email', 'text_messaging', 'linkedin', 'skype_teams', 'slack', 'coffee', 'networking', 'party_social', 'other', 'meal', 'meeting', 'custom'
                  ]
                }
              },
              required: ['contactId', 'content'],
            },
          },
          {
            name: 'update_note',
            description: 'Update an existing note',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Note ID' },
                content: { type: 'string', description: 'Updated note content' },
              },
              required: ['id', 'content'],
            },
          },
          {
            name: 'delete_note',
            description: 'Delete a note',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Note ID' },
              },
              required: ['id'],
            },
          },
          // Reminder tools
          {
            name: 'get_reminders_by_contact',
            description: 'Get all reminders for a specific contact',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' },
              },
              required: ['contactId'],
            },
          },
          {
            name: 'get_all_reminders',
            description: 'Get all reminders with pagination',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'number', description: 'Number of reminders to retrieve (default: 50)' },
                offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
              },
            },
          },
          {
            name: 'search_reminders',
            description: 'Search reminders by text',
            inputSchema: {
              type: 'object',
              properties: {
                searchTerm: { type: 'string', description: 'Search term to find in reminder text' },
              },
              required: ['searchTerm'],
            },
          },
          {
            name: 'find_reminders_by_partial_id',
            description: 'Find reminders by partial ID or text content - useful when you have a numeric ID that needs to be converted to UUID',
            inputSchema: {
              type: 'object',
              properties: {
                partialId: { type: 'string', description: 'Partial ID or text to search for in reminder IDs and text content' },
              },
              required: ['partialId'],
            },
          },
          {
            name: 'create_reminder',
            description: 'Create a new reminder for a contact',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' },
                text: { type: 'string', description: 'Reminder text' },
                dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD format)' },
                recurrence: { type: 'string', description: 'Recurrence pattern (optional)' },
              },
              required: ['contactId', 'text', 'dueDate'],
            },
          },
          {
            name: 'update_reminder',
            description: 'Update an existing reminder',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Reminder ID' },
                text: { type: 'string', description: 'Reminder text' },
                dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD format)' },
                isComplete: { type: 'boolean', description: 'Whether the reminder is completed' },
                recurrence: { type: 'string', description: 'Recurrence pattern' },
              },
              required: ['id'],
            },
          },
          {
            name: 'complete_reminder',
            description: 'Mark a reminder as complete',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Reminder ID' },
              },
              required: ['id'],
            },
          },
          {
            name: 'delete_reminder',
            description: 'Delete a reminder',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Reminder ID' },
              },
              required: ['id'],
            },
          },
          // Helper tools for finding correct UUIDs
          {
            name: 'find_reminders_by_partial_id',
            description: 'Find reminders by partial ID or text content. Use this when you have an invalid UUID and need to find the correct reminder UUID.',
            inputSchema: {
              type: 'object',
              properties: {
                partial_id: { type: 'string', description: 'Partial ID, text content, or any identifying information for the reminder' },
              },
              required: ['partial_id'],
            },
          },
          {
            name: 'find_contacts_by_partial_id',
            description: 'Find contacts by partial ID, name, or company. Use this when you have an invalid UUID and need to find the correct contact UUID.',
            inputSchema: {
              type: 'object',
              properties: {
                partial_id: { type: 'string', description: 'Partial ID, name, company, or any identifying information for the contact' },
              },
              required: ['partial_id'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (!args) {
          throw new Error('No arguments provided');
        }

        switch (name) {
          // Contact operations
          case 'get_contacts':
            const contacts = await this.dexClient.getContacts(
              (args as any).limit || 50, 
              (args as any).offset || 0
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(contacts, null, 2),
                },
              ],
            };

          case 'get_contact_by_id':
            const contact = await this.dexClient.getContactById((args as any).id);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(contact, null, 2),
                },
              ],
            };

          case 'search_contacts':
            const searchResults = await this.dexClient.searchContacts((args as any).searchTerm);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(searchResults, null, 2),
                },
              ],
            };

          // Robust handler for find_contacts_by_partial_id
          case 'find_contacts_by_partial_id': {
            // Accept both partialId and partial_id for compatibility
            const partialId = (args as any).partialId || (args as any).partial_id;
            if (!partialId) {
              return {
                content: [
                  { type: 'text', text: 'Error: partialId or partial_id argument is required.' },
                ],
                isError: true,
              };
            }
            const foundContacts = await this.dexClient.findContactsByPartialId(partialId);
            if (!foundContacts.length) {
              return {
                content: [
                  { type: 'text', text: `No contacts found matching "${partialId}". Try a different search term.` },
                ],
              };
            }
            return {
              content: [
                { type: 'text', text: `Found ${foundContacts.length} contact(s) matching "${partialId}":\n\n` +
                  foundContacts.map((c: any) => `ID: ${c.id}\nName: ${c.full_name}\nCompany: ${c.company || 'N/A'}\n---`).join('\n') },
              ],
            };
          }

          case 'create_contact':
            const validatedContact = ContactSchema.parse({
              first_name: (args as any).first_name,
              last_name: (args as any).last_name,
              company: (args as any).company,
              job_title: (args as any).job_title,
              description: (args as any).description,
            });
            const newContact = await this.dexClient.createContact(validatedContact);
            return {
              content: [
                {
                  type: 'text',
                  text: `Contact created successfully: ${JSON.stringify(newContact, null, 2)}`,
                },
              ],
            };

          case 'update_contact':
            const { id, ...updates } = args as any;
            const updatedContact = await this.dexClient.updateContact(id, updates);
            return {
              content: [
                {
                  type: 'text',
                  text: `Contact updated successfully: ${JSON.stringify(updatedContact, null, 2)}`,
                },
              ],
            };

          case 'delete_contact':
            const deletedContact = await this.dexClient.deleteContact((args as any).id);
            return {
              content: [
                {
                  type: 'text',
                  text: `Contact deleted successfully: ${JSON.stringify(deletedContact, null, 2)}`,
                },
              ],
            };

          // Note operations
          case 'get_notes_by_contact':
            const notes = await this.dexClient.getNotesByContact((args as any).contactId);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(notes, null, 2),
                },
              ],
            };

          case 'get_all_notes':
            const allNotes = await this.dexClient.getAllNotes(
              (args as any).limit || 50,
              (args as any).offset || 0
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(allNotes, null, 2),
                },
              ],
            };

          case 'search_notes':
            const searchedNotes = await this.dexClient.searchNotes((args as any).searchTerm);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(searchedNotes, null, 2),
                },
              ],
            };

          case 'create_note':
            try {
              const newNote = await this.dexClient.createNote(
                (args as any).contactId,
                (args as any).content,
                (args as any).eventTime,
                (args as any).meetingType // pass through
              );
              return {
                content: [
                  {
                    type: 'text',
                    text: `Note created successfully: ${JSON.stringify(newNote, null, 2)}`,
                  },
                ],
              };
            } catch (error: any) {
              // Dex API returns check constraint violation for missing/invalid meeting_type
              const msg = error?.response?.data?.errors?.[0]?.message || error?.message || String(error);
              if (msg.includes('check constraint') && msg.includes('meeting_type')) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: 'Error: The Dex API requires a valid meeting type for every note. Please provide a meetingType argument with one of the following values: note, call, email, text_messaging, linkedin, skype_teams, slack, coffee, networking, party_social, other, meal, meeting, custom.',
                    },
                  ],
                  isError: true,
                };
              }
              // fallback: surface original error
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error creating note: ${msg}`,
                  },
                ],
                isError: true,
              };
            }

          case 'update_note':
            const updatedNote = await this.dexClient.updateNote((args as any).id, (args as any).content);
            return {
              content: [
                {
                  type: 'text',
                  text: `Note updated successfully: ${JSON.stringify(updatedNote, null, 2)}`,
                },
              ],
            };

          case 'delete_note':
            const deletedNote = await this.dexClient.deleteNote((args as any).id);
            return {
              content: [
                {
                  type: 'text',
                  text: `Note deleted successfully: ${JSON.stringify(deletedNote, null, 2)}`,
                },
              ],
            };

          // Reminder operations
          case 'get_reminders_by_contact':
            const reminders = await this.dexClient.getRemindersByContact((args as any).contactId);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(reminders, null, 2),
                },
              ],
            };

          case 'get_all_reminders':
            const allReminders = await this.dexClient.getAllReminders(
              (args as any).limit || 50,
              (args as any).offset || 0
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(allReminders, null, 2),
                },
              ],
            };

          case 'search_reminders':
            const searchedReminders = await this.dexClient.searchReminders((args as any).searchTerm);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(searchedReminders, null, 2),
                },
              ],
            };

          // Robust handler for find_reminders_by_partial_id
          case 'find_reminders_by_partial_id': {
            // Accept both partialId and partial_id for compatibility
            const partialId = (args as any).partialId || (args as any).partial_id;
            if (!partialId) {
              return {
                content: [
                  { type: 'text', text: 'Error: partialId or partial_id argument is required.' },
                ],
                isError: true,
              };
            }
            const foundReminders = await this.dexClient.findRemindersByPartialId(partialId);
            if (!foundReminders.length) {
              return {
                content: [
                  { type: 'text', text: `No reminders found matching "${partialId}". Try a different search term.` },
                ],
              };
            }
            return {
              content: [
                { type: 'text', text: `Found ${foundReminders.length} reminder(s) matching "${partialId}":\n\n` +
                  foundReminders.map((r: any) => `ID: ${r.id}\nText: ${r.text}\nDue: ${r.due_at_date}\nComplete: ${r.is_complete}\n---`).join('\n') },
              ],
            };
          }

          case 'create_reminder':
            const newReminder = await this.dexClient.createReminder(
              (args as any).contactId,
              (args as any).text,
              (args as any).dueDate,
              (args as any).recurrence
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Reminder created successfully: ${JSON.stringify(newReminder, null, 2)}`,
                },
              ],
            };

          case 'update_reminder':
            const reminderUpdates: any = {};
            if ((args as any).text) reminderUpdates.text = (args as any).text;
            if ((args as any).dueDate) reminderUpdates.due_at_date = (args as any).dueDate;
            if ((args as any).isComplete !== undefined) reminderUpdates.is_complete = (args as any).isComplete;
            if ((args as any).recurrence) reminderUpdates.recurrence = (args as any).recurrence;
            
            const updatedReminder = await this.dexClient.updateReminder((args as any).id, reminderUpdates);
            return {
              content: [
                {
                  type: 'text',
                  text: `Reminder updated successfully: ${JSON.stringify(updatedReminder, null, 2)}`,
                },
              ],
            };

          case 'complete_reminder':
            const completedReminder = await this.dexClient.completeReminder((args as any).id);
            return {
              content: [
                {
                  type: 'text',
                  text: `Reminder marked as complete: ${JSON.stringify(completedReminder, null, 2)}`,
                },
              ],
            };

          case 'delete_reminder':
            const deletedReminder = await this.dexClient.deleteReminder((args as any).id);
            return {
              content: [
                {
                  type: 'text',
                  text: `Reminder deleted successfully: ${JSON.stringify(deletedReminder, null, 2)}`,
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Public method to handle a tool call by name and arguments (for CLI/testing)
   */
  async handleToolCall(toolName: string, toolArgs: any) {
    // Replicate the logic from setRequestHandler
    switch (toolName) {
      case 'get_contacts':
        return await this.dexClient.getContacts(toolArgs.limit || 50, toolArgs.offset || 0);
      case 'get_contact_by_id':
        return await this.dexClient.getContactById(toolArgs.id);
      case 'search_contacts':
        return await this.dexClient.searchContacts(toolArgs.searchTerm);
      case 'create_contact':
        return await this.dexClient.createContact(toolArgs);
      case 'update_contact':
        return await this.dexClient.updateContact(toolArgs.id, toolArgs);
      case 'delete_contact':
        return await this.dexClient.deleteContact(toolArgs.id);
      case 'get_notes_by_contact':
        return await this.dexClient.getNotesByContact(toolArgs.contactId);
      case 'get_all_notes':
        return await this.dexClient.getAllNotes(toolArgs.limit || 50, toolArgs.offset || 0);
      case 'search_notes':
        return await this.dexClient.searchNotes(toolArgs.searchTerm);
      case 'create_note':
        return await this.dexClient.createNote(toolArgs.contactId, toolArgs.content, toolArgs.eventTime, toolArgs.meetingType);
      case 'update_note':
        return await this.dexClient.updateNote(toolArgs.id, toolArgs.content);
      case 'delete_note':
        return await this.dexClient.deleteNote(toolArgs.id);
      case 'get_reminders_by_contact':
        return await this.dexClient.getRemindersByContact(toolArgs.contactId);
      case 'get_all_reminders':
        return await this.dexClient.getAllReminders(toolArgs.limit || 50, toolArgs.offset || 0);
      case 'search_reminders':
        return await this.dexClient.searchReminders(toolArgs.searchTerm);
      case 'create_reminder':
        return await this.dexClient.createReminder(toolArgs.contactId, toolArgs.text, toolArgs.dueDate, toolArgs.recurrence);
      case 'update_reminder':
        return await this.dexClient.updateReminder(toolArgs.id, toolArgs);
      case 'complete_reminder':
        return await this.dexClient.completeReminder(toolArgs.id);
      case 'delete_reminder':
        return await this.dexClient.deleteReminder(toolArgs.id);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Public method to call a tool by name and arguments (for CLI/testing)
   */
  async callTool(toolName: string, toolArgs: any) {
    // Use the same handler logic as the MCP server
    const request = {
      method: 'tools/call',
      params: { name: toolName, arguments: toolArgs },
      id: 1,
      jsonrpc: '2.0',
    };
    // The handler is set on the server instance
    // Find the handler for CallToolRequestSchema
    const handler = (this.server as any)._requestHandlers?.find((h: any) => h && h._zodSchema === CallToolRequestSchema);
    if (!handler) throw new Error('Tool handler not found.');
    return handler(request);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Dex MCP server running on stdio');
  }
}

// CLI one-off tool-call support
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  console.error('[INFO] Entry: ESM main module');
  const argv = minimist(process.argv.slice(2));
  if (argv['tool-call'] && argv['args']) {
    console.error('[INFO] Running CLI tool-call:', argv['tool-call']);
    (async () => {
      const toolName = argv['tool-call'];
      let toolArgs;
      try {
        toolArgs = typeof argv['args'] === 'string' ? JSON.parse(argv['args']) : argv['args'];
      } catch {
        console.error('Invalid JSON for --args:', argv['args']);
        process.exit(1);
      }
      const server = new DexMCPServer();
      try {
        const result = await server.handleToolCall(toolName, toolArgs);
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      } catch (err) {
        console.error('Error running tool:', err);
        process.exit(1);
      }
    })();
  } else {
    console.error('[INFO] Starting Dex MCP server (agent mode)');
    const server = new DexMCPServer();
    server.run().catch((err) => {
      console.error('[FATAL] MCP server failed to start:', err);
      process.exit(1);
    });
  }
}

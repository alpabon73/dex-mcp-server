#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// Dex API configuration
const DEX_API_BASE_URL = 'https://api.getdex.com/v1/graphql';
const API_KEY = '8470e661c4efe0f';

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

const NoteSchema = z.object({
  id: z.string().optional(),
  note: z.string(),
  event_time: z.string().optional(),
  meeting_type: z.string().optional(),
});

const ReminderSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  due_at_date: z.string(),
  recurrence: z.string().optional(),
  is_complete: z.boolean().optional(),
});

class DexAPIClient {
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

  async createNote(contactId: string, note: string, eventTime?: string) {
    const timelineItemQuery = `
      mutation CreateTimelineItem($timelineItem: timeline_items_insert_input!) {
        insert_timeline_items_one(object: $timelineItem) {
          id
          note
          event_time
          created_at
        }
      }
    `;
    
    // First create the timeline item
    const timelineItem = await this.executeQuery(timelineItemQuery, {
      timelineItem: {
        note: note,
        event_time: eventTime || new Date().toISOString(),
      }
    });

    // Then link it to the contact
    const linkQuery = `
      mutation LinkTimelineItemToContact($timelineItemContact: timeline_items_contacts_insert_input!) {
        insert_timeline_items_contacts_one(object: $timelineItemContact) {
          timeline_item_id
          contact_id
        }
      }
    `;

    await this.executeQuery(linkQuery, {
      timelineItemContact: {
        timeline_item_id: timelineItem.insert_timeline_items_one.id,
        contact_id: contactId,
      }
    });

    return timelineItem;
  }

  async updateNote(id: string, noteContent: string) {
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
    return this.updateReminder(id, { is_complete: true });
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
            description: 'Create a new note for a contact',
            inputSchema: {
              type: 'object',
              properties: {
                contactId: { type: 'string', description: 'Contact ID' },
                content: { type: 'string', description: 'Note content' },
                eventTime: { type: 'string', description: 'Event time (ISO format, optional)' },
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
        ] as Tool[],
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
            const newNote = await this.dexClient.createNote(
              (args as any).contactId,
              (args as any).content,
              (args as any).eventTime
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Note created successfully: ${JSON.stringify(newNote, null, 2)}`,
                },
              ],
            };

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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Dex MCP server running on stdio');
  }
}

const server = new DexMCPServer();
server.run().catch(console.error);

#!/usr/bin/env node
import { applyFieldPicking } from './utils.js';
import { config } from './config.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

console.error('--- Server process started ---');
console.error(`Current working directory: ${process.cwd()}`);
console.error(`Node version: ${process.version}`);

try {
    console.error('Creating McpServer instance...');
    const server = new McpServer({
        name: 'sentry-api-mcp-stdio',
        version: '1.0.0'
    });
    console.error('McpServer instance created.');

    // Define default fields for tools that support field picking
    const toolDefaultFields: { [key: string]: string } = {
        'listOrganizations': 'id,name,status,slug',
        'listProjectIssues': 'id,title,culprit,level,status,firstSeen,lastSeen,count,userCount,shortId',
        'listIssueEvents': 'id,eventID,title,culprit,platform,dateCreated,tags',
        'getProjectEvent': 'eventID,title,culprit,dateCreated,tags,entries,platform',
    };

    console.error('Registering listOrganizations tool...');
    const organizationSchema = z.object({
        id: z.string().optional(),
        slug: z.string().optional(),
        name: z.string().optional(),
        dateCreated: z.string().optional(),
        status: z.object({
            id: z.string(),
            name: z.string(),
        }).optional(),
    }).passthrough();

    server.registerTool(
        'listOrganizations',
        {
            title: 'List Organizations',
            description: 'Return a list of organizations available to the authenticated session.',
            inputSchema: {
                owner: z.boolean().optional().describe("Specify true to restrict results to organizations in which you are an owner."),
                cursor: z.string().optional().describe("A pointer to the last object fetched; used to retrieve the next or previous results."),
                query: z.string().optional().describe("Filters results by using Sentry query syntax."),
                sortBy: z.string().optional().describe("The field to sort results by (members, projects, or events)."),
                fields: z.string().optional().describe('A comma-separated list of fields to return (e.g., "name,slug,id").'),
            },
            outputSchema: {
                organizations: z.array(organizationSchema)
            },
        },
        async ({ owner, cursor, query, sortBy, fields }) => {
            const toolName = 'listOrganizations';
            console.error(`Executing ${toolName} tool...`);

            // Use user-provided fields, or fall back to the default for this tool
            const effectiveFields = fields ?? toolDefaultFields[toolName];
            console.error(`Effective fields for ${toolName}: ${effectiveFields}`);

            const apiUrl = new URL('/api/0/organizations/', String(config.host));

            // Append query parameters if they are provided
            if (owner !== undefined) apiUrl.searchParams.append('owner', String(owner));
            if (cursor) apiUrl.searchParams.append('cursor', cursor);
            if (query) apiUrl.searchParams.append('query', query);
            if (sortBy) apiUrl.searchParams.append('sortBy', sortBy);

            try {
                const response = await fetch(apiUrl.toString(), {
                    headers: {
                        'Authorization': `Bearer ${String(config.accessToken)}`,
                    },
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
                    return {
                        content: [{ type: 'text', text: `API Error: ${response.status} ${response.statusText}
${errorBody}` }],
                        isError: true,
                    };
                }

                const organizations = await response.json();
                
                // Apply field picking using the generic utility and effective fields
                const finalData = applyFieldPicking(organizations, effectiveFields);

                return {
                    content: [{ type: 'text', text: JSON.stringify(finalData, null, 2) }],
                    structuredContent: { organizations: finalData },
                };

            } catch (error) {
                console.error(`Network or other error in ${toolName}: ${error instanceof Error ? error.stack : String(error)}`);
                return {
                    content: [{ type: 'text', text: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` }],
                    isError: true,
                };
            }
        }
    );
    console.error('listOrganizations tool registered.');

    console.error('Registering listProjectIssues tool...');
    const issueSchema = z.object({
        id: z.string().optional(),
        title: z.string().optional(),
        culprit: z.string().optional(),
        level: z.string().optional(),
        status: z.string().optional(),
        firstSeen: z.string().optional(),
        lastSeen: z.string().optional(),
        count: z.string().optional(),
        userCount: z.number().optional(),
        shortId: z.string().optional(),
        project: z.object({ 
            id: z.string(), 
            name: z.string(), 
            slug: z.string() 
        }).optional(),
    }).passthrough();

    server.registerTool(
        'listProjectIssues',
        {
            title: "List a Project's Issues",
            description: "Return a list of issues (groups) bound to a project.",
            inputSchema: {
                organizationIdOrSlug: z.string().describe("The ID or slug of the organization."),
                projectIdOrSlug: z.string().describe("The ID or slug of the project."),
                statsPeriod: z.string().optional().describe('Optional stat period ("24h", "14d", or ""). Defaults to "24h".'),
                shortIdLookup: z.boolean().optional().describe("If true, short IDs are looked up as well."),
                query: z.string().optional().describe('Optional Sentry structured search query. Defaults to "is:unresolved".'),
                hashes: z.string().optional().describe("A comma-separated list of group hashes to return."),
                cursor: z.string().optional().describe("A pointer to the last object fetched."),
                fields: z.string().optional().describe('A comma-separated list of fields to return.'),
            },
            outputSchema: {
                issues: z.array(issueSchema),
            },
        },
        async (args) => {
            const { organizationIdOrSlug, projectIdOrSlug, statsPeriod, shortIdLookup, query, hashes, cursor, fields } = args;
            const toolName = 'listProjectIssues';
            console.error(`Executing ${toolName} tool for project ${organizationIdOrSlug}/${projectIdOrSlug}`);

            const effectiveFields = fields ?? toolDefaultFields[toolName];
            console.error(`Effective fields for ${toolName}: ${effectiveFields}`);

            const apiUrl = new URL(`/api/0/projects/${organizationIdOrSlug}/${projectIdOrSlug}/issues/`, String(config.host));

            if (statsPeriod) apiUrl.searchParams.append('statsPeriod', statsPeriod);
            if (shortIdLookup) apiUrl.searchParams.append('shortIdLookup', '1');
            if (query) apiUrl.searchParams.append('query', query);
            if (hashes) apiUrl.searchParams.append('hashes', hashes);
            if (cursor) apiUrl.searchParams.append('cursor', cursor);

            try {
                const response = await fetch(apiUrl.toString(), {
                    headers: {
                        'Authorization': `Bearer ${String(config.accessToken)}`,
                    },
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
                    return {
                        content: [{ type: 'text', text: `API Error: ${response.status} ${response.statusText}
${errorBody}` }],
                        isError: true,
                    };
                }

                const issues = await response.json();
                const finalData = applyFieldPicking(issues, effectiveFields);

                return {
                    content: [{ type: 'text', text: JSON.stringify(finalData, null, 2) }],
                    structuredContent: { issues: finalData },
                };

            } catch (error) {
                console.error(`Network or other error in ${toolName}: ${error instanceof Error ? error.stack : String(error)}`);
                return {
                    content: [{ type: 'text', text: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` }],
                    isError: true,
                };
            }
        }
    );
    console.error('listProjectIssues tool registered.');

    console.error('Registering listIssueEvents tool...');
    const eventSchema = z.object({
        id: z.string().optional(),
        eventID: z.string().optional(),
        title: z.string().optional(),
        culprit: z.string().optional(),
        platform: z.string().optional(),
        dateCreated: z.string().optional(),
        tags: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    }).passthrough();

    server.registerTool(
        'listIssueEvents',
        {
            title: "List an Issue's Events",
            description: "Return a list of error events bound to an issue.",
            inputSchema: {
                organizationIdOrSlug: z.string().describe("The ID or slug of the organization."),
                issueId: z.string().describe("The ID of the issue to query."),
                start: z.string().optional().describe("Start of the time period in ISO-8601 format."),
                end: z.string().optional().describe("End of the time period in ISO-8601 format."),
                statsPeriod: z.string().optional().describe('Time period for the query (e.g., "24h", "14d"). Overrides start/end.'),
                environment: z.array(z.string()).optional().describe("Name of environments to filter by."),
                full: z.boolean().optional().describe("Include the full event body and stacktrace."),
                sample: z.boolean().optional().describe("Return events in pseudo-random order."),
                query: z.string().optional().describe('Optional search query for filtering events.'),
                fields: z.string().optional().describe('A comma-separated list of fields to return.'),
            },
            outputSchema: {
                events: z.array(eventSchema),
            },
        },
        async (args) => {
            const { organizationIdOrSlug, issueId, start, end, statsPeriod, environment, full, sample, query, fields } = args;
            const toolName = 'listIssueEvents';
            console.error(`Executing ${toolName} tool for issue ${issueId}`);

            const effectiveFields = fields ?? toolDefaultFields[toolName];
            console.error(`Effective fields for ${toolName}: ${effectiveFields}`);

            const apiUrl = new URL(`/api/0/organizations/${organizationIdOrSlug}/issues/${issueId}/events/`, String(config.host));

            if (start) apiUrl.searchParams.append('start', start);
            if (end) apiUrl.searchParams.append('end', end);
            if (statsPeriod) apiUrl.searchParams.append('statsPeriod', statsPeriod);
            if (full) apiUrl.searchParams.append('full', 'true');
            if (sample) apiUrl.searchParams.append('sample', 'true');
            if (query) apiUrl.searchParams.append('query', query);
            if (environment) {
                environment.forEach(env => apiUrl.searchParams.append('environment', env));
            }

            try {
                const response = await fetch(apiUrl.toString(), {
                    headers: {
                        'Authorization': `Bearer ${String(config.accessToken)}`,
                    },
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
                    return {
                        content: [{ type: 'text', text: `API Error: ${response.status} ${response.statusText}
${errorBody}` }],
                        isError: true,
                    };
                }

                const events = await response.json();
                const finalData = applyFieldPicking(events, effectiveFields);

                return {
                    content: [{ type: 'text', text: JSON.stringify(finalData, null, 2) }],
                    structuredContent: { events: finalData },
                };

            } catch (error) {
                console.error(`Network or other error in ${toolName}: ${error instanceof Error ? error.stack : String(error)}`);
                return {
                    content: [{ type: 'text', text: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` }],
                    isError: true,
                };
            }
        }
    );
    console.error('listIssueEvents tool registered.');

    console.error('Registering getProjectEvent tool...');
    const projectEventSchema = z.object({
        eventID: z.string().optional(),
        title: z.string().optional(),
        culprit: z.string().optional(),
        platform: z.string().optional(),
        dateCreated: z.string().optional(),
        tags: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
        entries: z.array(z.any()).optional(), // Keep entries flexible, but especially look for stacktrace
    }).passthrough();

    server.registerTool(
        'getProjectEvent',
        {
            title: "Retrieve an Event for a Project",
            description: "Return details on an individual event, including stacktrace.",
            inputSchema: {
                organizationIdOrSlug: z.string().describe("The ID or slug of the organization."),
                projectIdOrSlug: z.string().describe("The ID or slug of the project."),
                eventId: z.string().describe("The hexadecimal ID of the event to retrieve."),
                fields: z.string().optional().describe('A comma-separated list of fields to return.'),
            },
            outputSchema: {
                event: projectEventSchema,
            },
        },
        async (args) => {
            const { organizationIdOrSlug, projectIdOrSlug, eventId, fields } = args;
            const toolName = 'getProjectEvent';
            console.error(`Executing ${toolName} tool for event ${eventId}`);

            const effectiveFields = fields ?? toolDefaultFields[toolName];
            console.error(`Effective fields for ${toolName}: ${effectiveFields}`);

            const apiUrl = new URL(`/api/0/projects/${organizationIdOrSlug}/${projectIdOrSlug}/events/${eventId}/`, String(config.host));

            try {
                const response = await fetch(apiUrl.toString(), {
                    headers: {
                        'Authorization': `Bearer ${String(config.accessToken)}`,
                    },
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
                    return {
                        content: [{ type: 'text', text: `API Error: ${response.status} ${response.statusText}
${errorBody}` }],
                        isError: true,
                    };
                }

                const event = await response.json();
                const finalData = applyFieldPicking(event, effectiveFields);

                return {
                    content: [{ type: 'text', text: JSON.stringify(finalData, null, 2) }],
                    structuredContent: { event: finalData },
                };

            } catch (error) {
                console.error(`Network or other error in ${toolName}: ${error instanceof Error ? error.stack : String(error)}`);
                return {
                    content: [{ type: 'text', text: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` }],
                    isError: true,
                };
            }
        }
    );
    console.error('getProjectEvent tool registered.');

    async function main() {
        try {
            console.error('Creating StdioServerTransport...');
            const transport = new StdioServerTransport();
            console.error('Connecting server to transport...');
            await server.connect(transport);
            // Also log to stderr for real-time viewing if possible
            console.error('MCP server connected to stdio and running.');
        } catch (error) {
            console.error(`Error in main function: ${error instanceof Error ? error.stack : String(error)}`);
            process.exit(1);
        }
    }

    main();

} catch (e) {
    console.error(`A critical error occurred during initialization: ${e instanceof Error ? e.stack : String(e)}`);
    process.exit(1);
}
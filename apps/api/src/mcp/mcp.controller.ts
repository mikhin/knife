import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpService } from "@/mcp/mcp.service";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Request, Response } from "express";

const NOTHING_TO_STREAM = {
  error: {
    code: -32000,
    message: "This server answers one request at a time: POST only",
  },
  id: null,
  jsonrpc: "2.0",
} as const;

/**
 * The second door into a universe. The first is the browser, where a person
 * reads and deletes; this one answers an agent, and both stand on the same
 * calculation — a repeat means the same thing on either side of the door.
 *
 * The pass is checked by middleware before anything here runs, and what it
 * says about the bearer travels into every tool call.
 *
 * A request carries everything it needs: no session is kept, so the machine
 * that answers the next call may be a different one, or the same one started
 * again a second ago.
 */
@Controller("mcp")
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Post()
  async speak(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    /** No sessionIdGenerator at all: that is what puts the transport in
     * stateless mode, where every request brings its own transport. */
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    const server = this.mcp.create();

    response.on("close", () => {
      void transport.close();
      void server.close();
    });

    /** The SDK's declarations predate exactOptionalPropertyTypes: its own
     * transport reads as the wrong shape while being the only right one. */
    await server.connect(transport as Transport);
    await transport.handleRequest(request, response, request.body);
  }

  @Get()
  @HttpCode(405)
  refuseStream(): typeof NOTHING_TO_STREAM {
    return NOTHING_TO_STREAM;
  }

  @Delete()
  @HttpCode(405)
  refuseGoodbye(): typeof NOTHING_TO_STREAM {
    return NOTHING_TO_STREAM;
  }
}

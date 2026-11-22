import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { SeatMapResponseDto } from './dto/seat-map-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@ApiTags('Events & Discovery')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event with seat map (Organizer Only)' })
  @ApiResponse({ status: 201, description: 'Event and seat grid created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Organizers can create events' })
  async create(
    @CurrentUser('id') organizerId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.createEvent(organizerId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Browse events with search, city filter, date range, and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of events with starting prices' })
  async findAll(@Query() query: EventQueryDto) {
    return this.eventsService.findAll(query);
  }

  @Get('organizer/my-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all events owned by the authenticated organizer" })
  @ApiResponse({ status: 200, description: 'List of organizer events' })
  async findMyEvents(@CurrentUser('id') organizerId: string) {
    return this.eventsService.findOrganizerEvents(organizerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event details by ID' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event details and pricing tiers' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Get(':id/seats')
  @ApiOperation({
    summary: 'Get interactive seat map with dynamic lazy hold expiry status',
  })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Seat map grid with live availability status', type: SeatMapResponseDto })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getSeatMap(
    @Param('id') eventId: string,
    @Req() req: Request,
  ): Promise<SeatMapResponseDto> {
    let currentUserId: string | undefined = undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload: any = this.jwtService.decode(token);
        if (payload && payload.sub) {
          currentUserId = payload.sub;
        }
      } catch {
        // Ignore token decode errors for public seat map view
      }
    }

    return this.eventsService.getSeatMap(eventId, currentUserId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an event (Organizer can only manage own events)' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot update another organizer event' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async update(
    @CurrentUser('id') organizerId: string,
    @Param('id') eventId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(organizerId, eventId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event (Organizer can only delete own events)' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Event successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot delete another organizer event' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async delete(
    @CurrentUser('id') organizerId: string,
    @Param('id') eventId: string,
  ) {
    return this.eventsService.deleteEvent(organizerId, eventId);
  }
}

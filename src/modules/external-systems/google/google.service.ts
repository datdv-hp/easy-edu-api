import { BaseService } from '@/common/services/base.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import pMap from 'src/plugins/pMap';
import { GoogleLoginLinkDto } from './google.dto';
import { IGoogleLoginBody, IGoogleMeetingDetail } from './google.interfaces';

@Injectable()
export class GoogleService extends BaseService {
  googleClient: OAuth2Client;
  constructor(
    protected readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    super(GoogleService.name, configService);
  }

  clientId = process.env.GOOGLE_CLIENT_ID;
  clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  async createGoogleSchedule(
    dto: IGoogleLoginBody,
    meetingDetails: IGoogleMeetingDetail[],
  ) {
    try {
      const googleClient = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
      );
      const googleCredential = await this._GetGoogleCredentialByAuthorizedCode(
        dto.code,
        dto.redirectUri,
      );
      googleClient.setCredentials(googleCredential);

      const calendar = google.calendar({ version: 'v3', auth: googleClient });
      const timeZone = process.env.TZ;
      const numberOfEventsCreateAtSameTime = 10;

      const hangoutLinkMapByRandomString = {};
      const insertCalendar = async (meetingDetail: IGoogleMeetingDetail) => {
        try {
          const response = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            auth: googleClient,
            requestBody: {
              end: {
                dateTime: meetingDetail.endDateTime,
                timeZone,
              },
              start: {
                dateTime: meetingDetail.startDateTime,
                timeZone,
              },
              attendees: meetingDetail.attendeesEmails,
              conferenceData: {
                createRequest: {
                  conferenceSolutionKey: {
                    type: 'hangoutsMeet',
                  },
                  requestId: 'some-random-string',
                },
              },
              summary: meetingDetail.summary,
            },
          });
          const eventId = response.data.id;
          const hangoutLink = response.data.hangoutLink;
          if (eventId) {
            const params = {
              calendarId: 'primary',
              eventId: eventId,
            };

            await calendar.events.delete(params);
          }
          hangoutLinkMapByRandomString[meetingDetail?.randomString] =
            hangoutLink;
        } catch (e) {
          this.logger.error(
            'Error in createGoogleSchedule() insertCalendar: ' + e,
          );
        }
      };

      await pMap(meetingDetails, insertCalendar, {
        concurrency: numberOfEventsCreateAtSameTime,
      });

      return hangoutLinkMapByRandomString;
    } catch (e) {
      this.logger.error('Error in createGoogleSchedule: ' + e);
    }
  }

  getGoogleLink(dto: GoogleLoginLinkDto) {
    try {
      const googleClient = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
      );
      const googleLoginUrl = googleClient.generateAuthUrl({
        redirect_uri: dto.redirectUri,
        scope: dto.scopes,
        access_type: 'offline',
        prompt: 'consent',
      });
      return googleLoginUrl;
    } catch (error) {
      this.logger.error('Error in getGoogleLink: ' + error);
      throw error;
    }
  }

  async getLoginEmail(dto: IGoogleLoginBody) {
    try {
      const googleClient = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
      );
      const googleCredential = await this._GetGoogleCredentialByAuthorizedCode(
        dto.code,
        dto.redirectUri,
      );
      const info = await googleClient.getTokenInfo(
        googleCredential.access_token,
      );
      return info.email;
    } catch (error) {
      this.logger.error('Error in getLoginEmail: ' + error);
      throw error;
    }
  }

  private async _GetGoogleCredentialByAuthorizedCode(
    code: string,
    redirectUri: string,
  ) {
    let googleCredential = await this.cache.get<{
      access_token: string;
    }>(code);

    if (!googleCredential) {
      const googleClient = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
      );
      const { tokens, res } = await googleClient.getToken({
        code: code,
        redirect_uri: redirectUri || undefined,
      });
      if (res.status !== 200) {
        throw new Error('Invalid Google token');
      }
      const credential = {
        access_token: tokens.access_token,
      };
      const TTL_EXPIRE_IN_ONE_HOUR = 3600 * 1000;
      await this.cache.set(code, credential, TTL_EXPIRE_IN_ONE_HOUR);
      googleCredential = credential;
    }
    return googleCredential;
  }
}

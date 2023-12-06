export interface IGoogleLoginBody {
  code: string;
  redirectUri?: string;
}
export class IGoogleMeetingDetail {
  randomString: string;
  summary: string;
  startDateTime: string;
  endDateTime: string;
  attendeesEmails?: {
    email: string;
  }[];
}

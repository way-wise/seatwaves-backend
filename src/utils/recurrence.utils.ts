import { addDays, addWeeks, isBefore } from 'date-fns';
import { RecurrenceRuleDto } from 'src/event/dto/create.event.dto';

export class RecurrenceUtils {
  static generateDatesFromRule(
    rule: RecurrenceRuleDto,
    fromDate: Date,
    totalDays: number,
    endDate: Date,
  ): Date[] {
    const dates: Date[] = [];
    const iCalDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const byDays = rule.byday || [];
    const interval = rule.interval || 1;

    const rangeEnd = endDate ? new Date(endDate) : addDays(fromDate, totalDays);

    let currentWeek = new Date(fromDate);

    while (isBefore(currentWeek, rangeEnd)) {
      for (const byday of byDays) {
        const dayIndex = iCalDays.indexOf(byday);
        if (dayIndex === -1) continue;

        // Calculate the date for this byday in the current week
        const offset = (dayIndex - currentWeek.getDay() + 7) % 7;
        const instanceDate = addDays(currentWeek, offset);

        // Skip if out of range
        if (instanceDate > rangeEnd || instanceDate < fromDate) continue;

        dates.push(instanceDate);
        if (rule.count && dates.length >= rule.count) break;
      }

      if (rule.count && dates.length >= rule.count) break;

      currentWeek = addWeeks(currentWeek, interval);
    }

    return dates;
  }

  //get only next dates check recurrence
  // Get only future or current dates (including today)
  static getOnlyNextDate(dates: Date[]) {
    const now = new Date();
    return dates.filter((date) => date.getTime() >= now.getTime());
  }
}

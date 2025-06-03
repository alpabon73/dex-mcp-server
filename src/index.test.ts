// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { DexAPIClient } from './index.js';

/**
 * Returns mapped meeting type for test input (string or undefined)
 * @param {unknown} input
 * @returns {string}
 */
function getMappedMeetingType(input: unknown): string {
  const allowedTypes = [
    'note', 'call', 'email', 'text_messaging', 'linkedin', 'skype_teams', 'slack', 'coffee', 'networking', 'party_social', 'other', 'meal', 'meeting', 'custom'
  ];
  let type = 'note';
  if (input) {
    const normalized = String(input).trim().toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
    // @ts-ignore
    type = DexAPIClient.meetingTypeMap[normalized] || DexAPIClient.meetingTypeMap[String(input).toLowerCase()] || 'note';
  }
  if (!allowedTypes.includes(type)) type = 'note';
  return type;
}

describe('DexAPIClient meetingType mapping', () => {
  const cases: [unknown, string][] = [
    ['Note', 'note'],
    ['Call', 'call'],
    ['Email', 'email'],
    ['Text/Messaging', 'text_messaging'],
    ['Text messaging', 'text_messaging'],
    ['text messaging', 'text_messaging'],
    ['Linkedin', 'linkedin'],
    ['Skype/Teams', 'skype_teams'],
    ['Skype teams', 'skype_teams'],
    ['Slack', 'slack'],
    ['Coffee', 'coffee'],
    ['Networking', 'networking'],
    ['Party/Social', 'party_social'],
    ['Party social', 'party_social'],
    ['Other', 'other'],
    ['Meal', 'meal'],
    ['Meeting', 'meeting'],
    ['Custom', 'custom'],
    ['note', 'note'],
    ['call', 'call'],
    ['email', 'email'],
    ['text_messaging', 'text_messaging'],
    ['linkedin', 'linkedin'],
    ['skype_teams', 'skype_teams'],
    ['slack', 'slack'],
    ['coffee', 'coffee'],
    ['networking', 'networking'],
    ['party_social', 'party_social'],
    ['other', 'other'],
    ['meal', 'meal'],
    ['meeting', 'meeting'],
    ['custom', 'custom'],
    ['not_a_type', 'note'],
    ['', 'note'],
    [undefined, 'note'],
  ];

  cases.forEach(([input, expected]) => {
    it(`maps "${input}" to "${expected}"`, () => {
      expect(getMappedMeetingType(input)).toBe(expected);
    });
  });
});

import {
  buildSymptomPayload,
  emptyAnswers,
  NOTES_MAX,
  validateAnswers,
  type QuestionnaireAnswers,
} from './questionnaire';

describe('validateAnswers', () => {
  it('rejects an empty submission', () => {
    expect(validateAnswers(emptyAnswers)).toMatch(/concern or at least one symptom/i);
  });
  it('accepts a primary concern alone', () => {
    expect(validateAnswers({ ...emptyAnswers, primaryConcern: 'digestion' })).toBeNull();
  });
  it('accepts a symptom alone', () => {
    expect(validateAnswers({ ...emptyAnswers, symptoms: ['vomiting'] })).toBeNull();
  });
  it('rejects over-long notes', () => {
    expect(validateAnswers({ ...emptyAnswers, symptoms: ['vomiting'], notes: 'x'.repeat(NOTES_MAX + 1) })).toMatch(
      /or fewer/i,
    );
  });
});

describe('buildSymptomPayload', () => {
  it('omits empty fields', () => {
    expect(buildSymptomPayload(emptyAnswers)).toEqual({});
  });
  it('includes only the answered fields, trimming notes', () => {
    const answers: QuestionnaireAnswers = {
      primaryConcern: 'digestion',
      symptoms: ['vomiting', 'reduced_appetite'],
      duration: '1_3_days',
      notes: '  ate something odd  ',
    };
    expect(buildSymptomPayload(answers)).toEqual({
      primary_concern: 'digestion',
      symptoms: ['vomiting', 'reduced_appetite'],
      duration: '1_3_days',
      notes: 'ate something odd',
    });
  });
  it('drops blank notes', () => {
    expect(buildSymptomPayload({ ...emptyAnswers, symptoms: ['coughing'], notes: '   ' })).toEqual({
      symptoms: ['coughing'],
    });
  });
});

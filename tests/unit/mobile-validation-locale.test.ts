import {describe,expect,it} from 'vitest';
import {phoneErrorText,phoneValidationSummary,phoneValidationText} from '@/lib/listings/mobiles/locale';
describe('Phone validation localization',()=>{
 it('translates schema defaults and specific warranty/photo messages',()=>{
  expect(phoneValidationText('hi','title','String must contain at least 3 character(s)')).toBe('3–150 अक्षरों का शीर्षक लिखें।');
  expect(phoneValidationText('hi','warranty_until','Enter a current warranty expiry month.')).toContain('वारंटी');
  expect(phoneValidationText('hi','media_ids','Choose distinct photos.')).toBe('हर तस्वीर केवल एक बार चुनें।');
 });
 it('builds a Hindi summary and retains the concise English price summary',()=>{
  expect(phoneValidationSummary('hi','price_paise',1)).toBe('कीमत (₹) और 1 अन्य फ़ील्ड ठीक करें');
  expect(phoneValidationSummary('en','price_paise',1)).toBe('Fix Price and 1 other field');
 });
 it('never exposes untranslated transport errors in Hindi and preserves English errors',()=>{
  expect(phoneErrorText('hi','Unrecognized transport error')).not.toContain('transport');
  expect(phoneErrorText('hi','Sign in to continue.')).toContain('साइन इन');
  expect(phoneErrorText('en','Sign in to continue.')).toBe('Sign in to continue.');
 });
});

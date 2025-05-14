import { Action } from '../types';
import testActions from './testActions';
import monthlyReturnsActions from './monthlyReturnsActions';

export const actions: Action[] = [...testActions, ...monthlyReturnsActions];

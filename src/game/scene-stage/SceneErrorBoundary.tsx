'use client';
import { Component, type ReactNode } from 'react';
import { reportError } from '@/platform/errors/bridge';
import { SceneBindError } from './bind';

/**
 * A scene that fails (chunk load, bad binding, render error) falls back to the calm picture the caller passes
 * (QuestionVisual or ScenePicture). The error is reported, never swallowed; in production only logged so a child sees no alert.
 */
export class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode; onError?: (e: unknown) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
    // a question that cannot bind to a scene is an expected case: the stage silently shows the calm picture, no alert, no toast
    if (error instanceof SceneBindError) return void console.warn('scene-stage: no scene for this question', error.message);
    if (process.env.NODE_ENV === 'production') console.error('scene-stage fallback', error);
    else reportError(error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

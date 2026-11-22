'use client';
import { Component, type ReactNode } from 'react';
import { reportError } from '@/platform/errors/bridge';

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
    if (process.env.NODE_ENV === 'production') console.error('scene-stage fallback', error);
    else reportError(error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

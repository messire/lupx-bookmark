import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import styles from "./ErrorBoundary.module.css";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary.
 * Catches unhandled render errors and shows a recovery UI instead of a
 * blank white tab — which would be a confusing and silent failure for users.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In a production extension you could send this to a logging service.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.container}>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.message}>
            An unexpected error occurred. Your bookmarks are safe — reload the tab to recover.
          </p>
          <pre className={styles.detail}>{this.state.error.message}</pre>
          <button className={styles.btn} onClick={() => window.location.reload()}>
            Reload tab
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

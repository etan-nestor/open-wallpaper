// components/ErrorBoundary.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedBackground from './AnimatedBackground';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <AnimatedBackground>
    <View style={errorStyles.container}>
      <Ionicons name="alert-circle" size={64} color="#FF6B9D" />
      <Text style={errorStyles.title}>Oops! Une erreur s&apos;est produite</Text>
      <Text style={errorStyles.message}>
        {error?.message || 'Une erreur inattendue s\'est produite'}
      </Text>
      <TouchableOpacity onPress={resetError} style={errorStyles.button}>
        <Text style={errorStyles.buttonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  </AnimatedBackground>
);

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

// Hook pour gérer les états de chargement/erreur
export const useAsyncOperation = () => {
  const [state, setState] = React.useState({
    loading: false,
    error: null as string | null,
    data: null as any,
  });

  const execute = React.useCallback(async (asyncFunction: () => Promise<any>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await asyncFunction();
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur s\'est produite';
      setState({ loading: false, error: errorMessage, data: null });
      throw error;
    }
  }, []);

  const reset = React.useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return { ...state, execute, reset };
};

// Composant de chargement réutilisable
export const LoadingState: React.FC<{ message?: string }> = ({ 
  message = "Chargement..." 
}) => (
  <AnimatedBackground>
    <View style={loadingStyles.container}>
      <View style={loadingStyles.content}>
        {/* Utiliser le Loader existant */}
        <Text style={loadingStyles.message}>{message}</Text>
      </View>
    </View>
  </AnimatedBackground>
);

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
});

// Composant d'état vide réutilisable
export const EmptyState: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ icon, title, subtitle, actionText, onAction }) => (
  <View style={emptyStyles.container}>
    <Ionicons name={icon as any} size={64} color="rgba(255,255,255,0.4)" />
    <Text style={emptyStyles.title}>{title}</Text>
    <Text style={emptyStyles.subtitle}>{subtitle}</Text>
    {actionText && onAction && (
      <TouchableOpacity onPress={onAction} style={emptyStyles.button}>
        <Text style={emptyStyles.buttonText}>{actionText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default ErrorBoundary;
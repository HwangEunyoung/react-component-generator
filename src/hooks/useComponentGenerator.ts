import { useState, useCallback } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { useLocalStorage } from './useLocalStorage';

const COMPONENTS_STORAGE_KEY = 'rcg:components';
const PROMPT_HISTORY_STORAGE_KEY = 'rcg:promptHistory';
const MAX_PROMPT_HISTORY = 20;

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  promptHistory: string[];
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
  clearPromptHistory: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useLocalStorage<GeneratedComponent[]>(
    COMPONENTS_STORAGE_KEY,
    [],
    {
      deserialize: (raw) =>
        (JSON.parse(raw) as GeneratedComponent[]).map((c) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        })),
    }
  );
  const [promptHistory, setPromptHistory] = useLocalStorage<string[]>(
    PROMPT_HISTORY_STORAGE_KEY,
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (prompt: string, apiKey: string | undefined, provider: Provider) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate component');
        }

        const newComponent: GeneratedComponent = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          prompt,
          code: data.code,
          createdAt: new Date(),
        };

        setComponents((prev) => [newComponent, ...prev]);
        setPromptHistory((prev) =>
          [prompt, ...prev.filter((p) => p !== prompt)].slice(0, MAX_PROMPT_HISTORY)
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [setComponents, setPromptHistory]
  );

  const removeComponent = useCallback(
    (id: string) => {
      setComponents((prev) => prev.filter((c) => c.id !== id));
    },
    [setComponents]
  );

  const clearAll = useCallback(() => {
    setComponents([]);
  }, [setComponents]);

  const clearPromptHistory = useCallback(() => {
    setPromptHistory([]);
  }, [setPromptHistory]);

  return {
    components,
    promptHistory,
    isLoading,
    error,
    generate,
    removeComponent,
    clearAll,
    clearPromptHistory,
  };
}

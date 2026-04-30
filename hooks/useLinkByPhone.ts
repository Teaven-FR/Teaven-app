import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface LinkByPhoneResult {
  success: boolean;
  phone: string;
  action: 'kept' | 'switched' | 'created';
  squareCustomerId: string;
  giftCardId: string;
  giftCardState: 'ACTIVE' | 'PENDING' | string;
  balance: number;
  phoneAddedToCurrent?: boolean;
}

export function useLinkByPhone() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = async (phone: string): Promise<LinkByPhoneResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('link-by-phone', {
        body: { phone },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      return data as LinkByPhoneResult;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { link, loading, error };
}

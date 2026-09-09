import { useMerchantContext } from '../hooks';
import { MerchantAcceptPage } from './MerchantAcceptPage';

export function MerchantAcceptRoute() {
  const { merchant } = useMerchantContext();
  return <MerchantAcceptPage merchant={merchant} />;
}

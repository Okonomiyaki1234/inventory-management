'use client';

import { useState, useEffect } from 'react';
import { supabase, Organization, Warehouse, Item, ItemWithWarehouse } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Package, Warehouse as WarehouseIcon, Chrome as Home, Minus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

export default function InventoryApp() {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizationCode, setOrganizationCode] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCode, setNewOrgCode] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<ItemWithWarehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemDescription, setNewItemDescription] = useState('');

  useEffect(() => {
    if (currentOrganization) {
      loadWarehouses();
      loadItems();
    }
  }, [currentOrganization]);

  const loadWarehouses = async () => {
    if (!currentOrganization) return;

    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('倉庫の読み込みに失敗しました');
      return;
    }

    setWarehouses(data || []);
  };

  const loadItems = async () => {
    if (!currentOrganization) return;

    const { data: warehouseData } = await supabase
      .from('warehouses')
      .select('id')
      .eq('organization_id', currentOrganization.id);

    if (!warehouseData || warehouseData.length === 0) {
      setItems([]);
      return;
    }

    const warehouseIds = warehouseData.map(w => w.id);

    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        warehouse:warehouses(*)
      `)
      .in('warehouse_id', warehouseIds)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('アイテムの読み込みに失敗しました');
      return;
    }

    setItems(data || []);
  };

  const joinOrganization = async () => {
    if (!organizationCode.trim()) {
      toast.error('組織コードを入力してください');
      return;
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('code', organizationCode.trim())
      .maybeSingle();

    if (error || !data) {
      toast.error('組織が見つかりませんでした');
      return;
    }

    setCurrentOrganization(data);
    toast.success(`${data.name}に接続しました`);
  };

  const createOrganization = async () => {
    if (!newOrgName.trim() || !newOrgCode.trim()) {
      toast.error('組織名とコードを入力してください');
      return;
    }

    const { data, error } = await supabase
      .from('organizations')
      .insert([{ name: newOrgName.trim(), code: newOrgCode.trim() }])
      .select()
      .single();

    if (error) {
      toast.error('組織の作成に失敗しました（コードが重複している可能性があります）');
      return;
    }

    setCurrentOrganization(data);
    setShowCreateOrg(false);
    setNewOrgName('');
    setNewOrgCode('');
    toast.success('組織を作成しました');
  };

  const createWarehouse = async () => {
    if (!newWarehouseName.trim() || !currentOrganization) return;

    const { error } = await supabase
      .from('warehouses')
      .insert([{ name: newWarehouseName.trim(), organization_id: currentOrganization.id }]);

    if (error) {
      toast.error('倉庫の作成に失敗しました');
      return;
    }

    setNewWarehouseName('');
    setShowAddWarehouse(false);
    loadWarehouses();
    toast.success('倉庫を作成しました');
  };

  const addOrUpdateItem = async () => {
    if (!newItemName.trim() || !selectedWarehouse || !currentOrganization) {
      toast.error('すべての項目を入力してください');
      return;
    }

    const quantity = parseInt(newItemQuantity) || 0;
    if (quantity <= 0) {
      toast.error('数量は1以上を入力してください');
      return;
    }

    const { data: existingItems, error: searchError } = await supabase
      .from('items')
      .select('*')
      .eq('warehouse_id', selectedWarehouse)
      .eq('name', newItemName.trim());

    if (searchError) {
      toast.error('アイテムの確認に失敗しました');
      return;
    }

    if (existingItems && existingItems.length > 0) {
      const existingItem = existingItems[0];
      const { error } = await supabase
        .from('items')
        .update({
          quantity: existingItem.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id);

      if (error) {
        toast.error('アイテムの更新に失敗しました');
        return;
      }
      toast.success(`${newItemName}を${quantity}個追加しました`);
    } else {
      const { error } = await supabase
        .from('items')
        .insert([{
          name: newItemName.trim(),
          quantity: quantity,
          description: newItemDescription.trim() || null,
          warehouse_id: selectedWarehouse
        }]);

      if (error) {
        toast.error('アイテムの追加に失敗しました');
        return;
      }
      toast.success('新しいアイテムを追加しました');
    }

    setNewItemName('');
    setNewItemQuantity('1');
    setNewItemDescription('');
    setShowAddItem(false);
    loadItems();
  };

  const updateItemQuantity = async (itemId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 0) {
      toast.error('数量は0未満にできません');
      return;
    }

    const { error } = await supabase
      .from('items')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      toast.error('数量の更新に失敗しました');
      return;
    }

    loadItems();
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast.error('アイテムの削除に失敗しました');
      return;
    }

    toast.success('アイテムを削除しました');
    loadItems();
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Toaster />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Package className="h-6 w-6" />
              在庫管理システム
            </CardTitle>
            <CardDescription>
              組織コードを入力するか、新しい組織を作成してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-code">組織コード</Label>
              <div className="flex gap-2">
                <Input
                  id="org-code"
                  placeholder="組織コードを入力"
                  value={organizationCode}
                  onChange={(e) => setOrganizationCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinOrganization()}
                />
                <Button onClick={joinOrganization}>接続</Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">または</span>
              </div>
            </div>

            <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  新しい組織を作成
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新しい組織を作成</DialogTitle>
                  <DialogDescription>
                    組織名とアクセスコードを設定してください
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-org-name">組織名</Label>
                    <Input
                      id="new-org-name"
                      placeholder="例: サッカー部"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-org-code">組織コード</Label>
                    <Input
                      id="new-org-code"
                      placeholder="例: soccer2024"
                      value={newOrgCode}
                      onChange={(e) => setNewOrgCode(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      このコードを共有すれば、メンバーがアクセスできます
                    </p>
                  </div>
                  <Button onClick={createOrganization} className="w-full">
                    作成
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Toaster />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              {currentOrganization.name}
            </h1>
            <Button
              variant="outline"
              onClick={() => setCurrentOrganization(null)}
            >
              組織を切り替え
            </Button>
          </div>
          <p className="text-muted-foreground">
            組織コード: <Badge variant="secondary">{currentOrganization.code}</Badge>
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <WarehouseIcon className="h-4 w-4" />
                倉庫数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{warehouses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                アイテム種類
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{items.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                総在庫数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {items.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>倉庫</span>
                <Dialog open={showAddWarehouse} onOpenChange={setShowAddWarehouse}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新しい倉庫を追加</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="warehouse-name">倉庫名</Label>
                        <Input
                          id="warehouse-name"
                          placeholder="例: 部室、顧問の家、部用車"
                          value={newWarehouseName}
                          onChange={(e) => setNewWarehouseName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && createWarehouse()}
                        />
                      </div>
                      <Button onClick={createWarehouse} className="w-full">
                        作成
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {warehouses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    倉庫がありません
                  </p>
                ) : (
                  warehouses.map((warehouse) => (
                    <div
                      key={warehouse.id}
                      className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 font-medium">{warehouse.name}</span>
                      <Badge variant="outline">
                        {items.filter(item => item.warehouse_id === warehouse.id).length}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>在庫一覧</span>
                <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={warehouses.length === 0}>
                      <Plus className="h-4 w-4 mr-1" />
                      追加・補充
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>アイテムの追加・補充</DialogTitle>
                      <DialogDescription>
                        既存のアイテムと同じ名前を入力すると数量が追加されます
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="warehouse-select">倉庫</Label>
                        <select
                          id="warehouse-select"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={selectedWarehouse}
                          onChange={(e) => setSelectedWarehouse(e.target.value)}
                        >
                          <option value="">倉庫を選択</option>
                          {warehouses.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="item-name">アイテム名</Label>
                        <Input
                          id="item-name"
                          placeholder="例: サッカーボール"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="item-quantity">数量</Label>
                        <Input
                          id="item-quantity"
                          type="number"
                          min="1"
                          value={newItemQuantity}
                          onChange={(e) => setNewItemQuantity(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="item-description">説明（任意）</Label>
                        <Textarea
                          id="item-description"
                          placeholder="例: 5号球、メーカー名など"
                          value={newItemDescription}
                          onChange={(e) => setNewItemDescription(e.target.value)}
                        />
                      </div>
                      <Button onClick={addOrUpdateItem} className="w-full">
                        追加・補充
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="アイテムを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {searchQuery ? '検索結果がありません' : 'アイテムがありません'}
                  </p>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Home className="h-3 w-3" />
                              {item.warehouse.name}
                            </Badge>
                            <Badge
                              variant={item.quantity > 0 ? 'default' : 'destructive'}
                              className="font-mono"
                            >
                              {item.quantity}個
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemQuantity(item.id, item.quantity, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemQuantity(item.id, item.quantity, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteItem(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

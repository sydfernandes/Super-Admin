"use client"

import React from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, ShoppingCart, Tags, PlusCircle, Trash2, Loader2, Upload } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PencilIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LayoutGrid, LayoutList, Grid3X3 } from "lucide-react"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import Image from "next/image"

// Import database files
import supermercados from "./supermercados.json"
import categorias from "./arvore_categorias.json"
import type { Producto, UnifiedProductsData } from "../../types/database"
import unifiedProductsData from "./unified_products.json"

const unifiedProducts = unifiedProductsData as UnifiedProductsData

// Add helper function to normalize image URLs
const normalizeImageUrl = (url: string) => {
  if (!url) return url;
  return url.replace('www.compraonline.alcampo.es', 'compraonline.alcampo.es');
};

// Add a helper function to get unique brands
const getUniqueBrands = () => {
  const uniqueBrands = new Set<string>();
  Object.values(unifiedProducts.products || {}).forEach(product => {
    if (product.brand) {
      uniqueBrands.add(product.brand);
    }
  });
  return Array.from(uniqueBrands);
};

interface Supermercado {
  id: string
  nombre: string
  url: string
  activo: boolean
}

interface Marca {
  nombre: string
  descripcion: string
  fabricante?: string
  pais_origen?: string
}

interface MarcaData {
  marcas: Marca[]
}

type SortField = "timestamp" | "precio" | "nombre" | "valoracion";
type SortOrder = "asc" | "desc";
type ViewMode = "list" | "medium" | "compact";

const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f6f7f8" offset="20%" />
      <stop stop-color="#edeef1" offset="50%" />
      <stop stop-color="#f6f7f8" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f6f7f8" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str)

export default function DatabasePage() {
  const [supermercadosList, setSupermercadosList] = useState<Supermercado[]>(supermercados.supermercados)
  const [isSaving, setIsSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const productsPerPage = 100
  const [sortField, setSortField] = useState<SortField>("timestamp")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [viewMode, setViewMode] = useState<ViewMode>("medium")

  // Calculate filtered and paginated products
  const allProducts: Producto[] = React.useMemo(() => 
    Object.values(unifiedProducts.products), 
    [unifiedProducts.products]
  );

  const filteredProducts = React.useMemo(() => 
    selectedBrands.length > 0
      ? allProducts.filter(product => selectedBrands.includes(product.brand))
      : allProducts,
    [allProducts, selectedBrands]
  );

  // Sort products
  const sortedProducts = React.useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "timestamp":
          const dateA = a.metadata?.original_data?.original_data?.timestamp 
            ? new Date(a.metadata.original_data.original_data.timestamp).getTime() 
            : 0;
          const dateB = b.metadata?.original_data?.original_data?.timestamp 
            ? new Date(b.metadata.original_data.original_data.timestamp).getTime() 
            : 0;
          comparison = dateA - dateB;
          break;
        case "precio":
          comparison = (a.price.current || 0) - (b.price.current || 0);
          break;
        case "nombre":
          comparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
          break;
        case "valoracion":
          const ratingA = a.metadata?.original_data?.original_data?.rating || 0;
          const ratingB = b.metadata?.original_data?.original_data?.rating || 0;
          comparison = ratingA - ratingB;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredProducts, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const currentProducts = React.useMemo(() => 
    sortedProducts.slice(
      (currentPage - 1) * productsPerPage,
      currentPage * productsPerPage
    ),
    [sortedProducts, currentPage, productsPerPage]
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBrands, sortField, sortOrder]);

  const handleBrandToggle = (brandName: string) => {
    setSelectedBrands(prev => {
      if (prev.includes(brandName)) {
        return prev.filter(b => b !== brandName)
      } else {
        return [...prev, brandName]
      }
    })
  }

  const handleAddSupermercado = () => {
    const newSupermercado: Supermercado = {
      id: `super_${Date.now()}`,
      nombre: "Nuevo Supermercado",
      url: "",
      activo: true
    }
    setSupermercadosList([...supermercadosList, newSupermercado])
  }

  const handleRemoveSupermercado = (id: string) => {
    setSupermercadosList(supermercadosList.filter(s => s.id !== id))
  }

  const handleUpdateSupermercado = (
    id: string, 
    field: keyof Supermercado, 
    value: string | boolean
  ) => {
    setSupermercadosList(supermercadosList.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/supermercados', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supermercadosList),
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success('Cambios guardados correctamente')
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Error al guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditClick = () => {
    setOpen(true)
  }

  // Get unique brands with their product counts
  const brandStats = React.useMemo(() => {
    const stats = new Map<string, number>();
    allProducts.forEach(product => {
      stats.set(product.brand, (stats.get(product.brand) || 0) + 1);
    });
    return Array.from(stats.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count); // Sort by count in descending order
  }, [allProducts]);

  const handleViewModeChange = React.useCallback((value: string | undefined) => {
    if (value) {
      setViewMode(value as ViewMode);
    }
  }, []);

  const handleSortFieldChange = React.useCallback((value: string) => {
    setSortField(value as SortField);
  }, []);

  const handleSortOrderChange = React.useCallback((value: string) => {
    setSortOrder(value as SortOrder);
  }, []);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/database">Base de Datos</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Vista General</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  asChild
                >
                  <Link href="/database/upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Archivos
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Subir archivos a la base de datos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Supermercados
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {supermercados.supermercados.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Marcas
              </CardTitle>
              <Tags className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getUniqueBrands().length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Productos
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredProducts.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Tables Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Supermercados Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Supermercados</CardTitle>
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={handleEditClick}
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span className="sr-only">Editar Supermercados</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Editar Supermercados</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </SheetTrigger>
                <SheetContent 
                  side="right" 
                  className="w-[400px] sm:w-[540px]"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <SheetHeader>
                    <SheetTitle>Editar Supermercados</SheetTitle>
                    <SheetDescription>
                      Gestione la lista de supermercados. Haga clic en guardar cuando termine.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 flex flex-col gap-4">
                    <Button 
                      onClick={handleAddSupermercado}
                      className="w-full"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Añadir Supermercado
                    </Button>
                    <div className="grid gap-4 overflow-y-auto max-h-[60vh]">
                      {supermercadosList.map((super_) => (
                        <Card key={super_.id}>
                          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4">
                            <div className="flex flex-col gap-2 w-full">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`nombre-${super_.id}`} className="w-16">
                                  Nombre
                                </Label>
                                <Input
                                  id={`nombre-${super_.id}`}
                                  value={super_.nombre}
                                  onChange={(e) => handleUpdateSupermercado(super_.id, 'nombre', e.target.value)}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`url-${super_.id}`} className="w-16">
                                  URL
                                </Label>
                                <Input
                                  id={`url-${super_.id}`}
                                  value={super_.url}
                                  onChange={(e) => handleUpdateSupermercado(super_.id, 'url', e.target.value)}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`activo-${super_.id}`} className="w-16">
                                  Activo
                                </Label>
                                <Switch
                                  id={`activo-${super_.id}`}
                                  checked={super_.activo}
                                  onCheckedChange={(checked) => handleUpdateSupermercado(super_.id, 'activo', checked)}
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveSupermercado(super_.id)}
                              className="text-destructive hover:text-destructive/90"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3 mt-4">
                      <Button 
                        onClick={handleSaveChanges} 
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <span className="mr-2">Guardando...</span>
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </>
                        ) : (
                          'Guardar Cambios'
                        )}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Nombre</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supermercadosList.map((super_) => (
                    <TableRow key={super_.id}>
                      <TableCell className="pl-4 font-medium">{super_.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <a 
                          href={super_.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {super_.url}
                        </a>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                          super_.activo 
                            ? "bg-green-50 text-green-700" 
                            : "bg-red-50 text-red-700"
                        )}>
                          {super_.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Marcas Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Marcas</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {getUniqueBrands().length} marcas encontradas
                </div>
              </div>
              {selectedBrands.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedBrands([])}
                >
                  Limpiar filtros
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {brandStats.map(({ brand, count }) => {
                    const isSelected = selectedBrands.includes(brand);
                    
                    return (
                      <Button
                        key={brand}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "h-auto py-1 px-3 text-sm",
                          isSelected && "bg-primary text-primary-foreground",
                          !isSelected && "hover:bg-primary/10"
                        )}
                        onClick={() => handleBrandToggle(brand)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium whitespace-nowrap">{brand}</span>
                          <span className={cn(
                            "text-xs rounded-full px-2 py-0.5",
                            isSelected 
                              ? "bg-white/20 text-white"
                              : "bg-primary/10 text-primary"
                          )}>
                            {count}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Productos</CardTitle>
              {selectedBrands.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Mostrando {filteredProducts.length} productos de {selectedBrands.length} marca{selectedBrands.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={handleViewModeChange}
                defaultValue="medium"
              >
                <ToggleGroupItem value="list" aria-label="Lista">
                  <LayoutList className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="medium" aria-label="Tarjetas medianas">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="compact" aria-label="Tarjetas compactas">
                  <Grid3X3 className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <div className="flex items-center gap-2">
                <Select
                  value={sortField}
                  onValueChange={handleSortFieldChange}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timestamp">Fecha</SelectItem>
                    <SelectItem value="precio">Precio</SelectItem>
                    <SelectItem value="nombre">Nombre</SelectItem>
                    <SelectItem value="valoracion">Valoración</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sortOrder}
                  onValueChange={handleSortOrderChange}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Orden" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascendente</SelectItem>
                    <SelectItem value="desc">Descendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "list" ? (
              <div className="space-y-2">
                {currentProducts.map((producto, index) => (
                  <Card key={producto.id} className="overflow-hidden hover:bg-accent/50 transition-colors">
                    <div className="flex items-center p-3 gap-4">
                      <div className="w-20 h-20 relative bg-white flex-shrink-0 rounded-md overflow-hidden">
                        {producto.metadata?.original_data?.original_data?.image_url ? (
                          <Image 
                            src={normalizeImageUrl(producto.metadata.original_data.original_data.image_url)}
                            alt={producto.name}
                            fill
                            className="object-contain p-1"
                            sizes="80px"
                            placeholder="blur"
                            blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(80, 80))}`}
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Database className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm line-clamp-2">
                          {producto.name}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
                          <span className="font-medium text-foreground">{producto.brand}</span>
                          <span>{producto.store}</span>
                          {producto.metadata?.original_data?.original_data?.rating && (
                            <span className="flex items-center gap-1">
                              {producto.metadata.original_data.original_data.rating.toFixed(1)} 
                              <span className="text-yellow-500">⭐</span>
                              {producto.metadata.original_data.original_data.review_count && 
                                <span className="text-muted-foreground">({producto.metadata.original_data.original_data.review_count})</span>
                              }
                            </span>
                          )}
                        </div>
                        {producto.metadata?.original_data?.category && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {producto.metadata.original_data.category} {producto.metadata.original_data.subcategory && `• ${producto.metadata.original_data.subcategory}`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="font-semibold">{producto.price.current.toFixed(2)} €</div>
                          {producto.metadata?.original_data?.original_data?.price_per_unit && (
                            <div className="text-xs text-muted-foreground">
                              {producto.metadata.original_data.original_data.price_per_unit}
                            </div>
                          )}
                          {producto.price.discount.has_discount && (
                            <div className="text-xs text-red-600 font-medium mt-0.5">
                              -{producto.price.discount.percentage}% ({producto.price.discount.amount.toFixed(2)} €)
                            </div>
                          )}
                        </div>
                        {producto.metadata?.original_data?.original_data?.url && (
                          <a 
                            href={producto.metadata.original_data.original_data.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md text-xs transition-colors"
                          >
                            Ver en {producto.store}
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className={cn(
                "grid gap-4",
                viewMode === "medium" && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
                viewMode === "compact" && "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10"
              )}>
                {currentProducts.map((producto, index) => (
                  <Card key={producto.id} className="overflow-hidden flex flex-col hover:bg-accent/50 transition-colors">
                    <div className={cn(
                      "w-full relative bg-white",
                      viewMode === "medium" && "aspect-square",
                      viewMode === "compact" && "aspect-[4/3]"
                    )}>
                      {producto.metadata?.original_data?.original_data?.image_url ? (
                        <Image 
                          src={normalizeImageUrl(producto.metadata.original_data.original_data.image_url)}
                          alt={producto.name}
                          fill
                          className="object-contain p-2"
                          sizes={cn(
                            viewMode === "medium" && "(min-width: 1536px) 16.67vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33.33vw, 50vw",
                            viewMode === "compact" && "(min-width: 1536px) 10vw, (min-width: 1280px) 12.5vw, (min-width: 1024px) 16.67vw, (min-width: 640px) 25vw, 33.33vw"
                          )}
                          placeholder="blur"
                          blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(400, 400))}`}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Database className={cn(
                            viewMode === "medium" && "h-8 w-8",
                            viewMode === "compact" && "h-6 w-6"
                          )} />
                        </div>
                      )}
                      {producto.price.discount.has_discount && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          -{producto.price.discount.percentage}%
                        </div>
                      )}
                      {producto.metadata?.original_data?.original_data?.status && viewMode === "medium" && (
                        <div className={cn(
                          "absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium",
                          producto.metadata.original_data.original_data.status === "AVAILABLE" 
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        )}>
                          {producto.metadata.original_data.original_data.status}
                        </div>
                      )}
                    </div>
                    <CardContent className={cn(
                      "flex-1 flex flex-col",
                      viewMode === "medium" && "p-3",
                      viewMode === "compact" && "p-2"
                    )}>
                      <h3 className={cn(
                        "font-medium mb-1",
                        viewMode === "medium" && "text-sm line-clamp-2",
                        viewMode === "compact" && "text-xs line-clamp-1"
                      )}>
                        {producto.name}
                      </h3>

                      <div className={cn(
                        "flex-1",
                        viewMode === "medium" && "space-y-2",
                        viewMode === "compact" && "space-y-1"
                      )}>
                        {viewMode === "medium" && (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Marca:</span>
                              <span className="font-medium">{producto.brand}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground text-xs">Precio:</span>
                              <div className="text-right">
                                <span className="font-semibold">{producto.price.current.toFixed(2)} €</span>
                                {producto.metadata?.original_data?.original_data?.price_per_unit && (
                                  <div className="text-xs text-muted-foreground">
                                    {producto.metadata.original_data.original_data.price_per_unit}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Tienda:</span>
                              <span>{producto.store}</span>
                            </div>

                            {(producto.metadata?.original_data?.original_data?.rating) && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Valoración:</span>
                                <div className="flex items-center gap-1">
                                  <span>{producto.metadata.original_data.original_data.rating.toFixed(1)}</span>
                                  <span className="text-yellow-500">⭐</span>
                                  {producto.metadata.original_data.original_data.review_count && (
                                    <span className="text-muted-foreground">
                                      ({producto.metadata.original_data.original_data.review_count})
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {viewMode === "compact" && (
                          <>
                            <div className="text-xs font-medium">{producto.price.current.toFixed(2)} €</div>
                            <div className="text-xs text-muted-foreground truncate">{producto.brand}</div>
                          </>
                        )}
                      </div>

                      {producto.metadata?.original_data?.original_data?.url && viewMode === "medium" && (
                        <a 
                          href={producto.metadata.original_data.original_data.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 w-full inline-flex items-center justify-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1.5 rounded-md text-xs transition-colors"
                        >
                          Ver en {producto.store}
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  )
} 
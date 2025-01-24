export interface Producto {
  id: string
  name: string
  brand: string
  store: string
  description: string
  price: {
    current: number
    previous: number
    discount: {
      has_discount: boolean
      amount: number
      percentage: number
    }
  }
  metadata: {
    source_file: string
    original_data: {
      name: string
      brand: string
      description: string
      price: {
        current: number
        previous: number
        discount: {
          has_discount: boolean
          amount: number
          percentage: number
        }
      }
      category: string
      subcategory: string
      store: string
      original_data: {
        id: string
        name: string
        brand: string
        price: number
        price_per_unit: string
        image_url: string
        url: string
        category: string
        subcategory: string
        status: string
        rating: number
        review_count: number
        timestamp: string
        page: number
      }
    }
  }
}

export interface UnifiedProductsData {
  brands: string[]
  last_updated: string
  products: Record<string, Producto>
}

export interface TreeItem {
  id: string
  name: string
  parentId: string | null
  children: TreeItem[]
} 
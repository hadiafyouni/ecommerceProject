import ProductsView from '@/components/ProductsView';

interface Props {
    params: Promise<{
        category_slug: string;
    }>;
}

export default async function CategoryPage({ params }: Props) {
    const resolvedParams = await params;
    return <ProductsView initialCategorySlug={resolvedParams.category_slug} />;
}

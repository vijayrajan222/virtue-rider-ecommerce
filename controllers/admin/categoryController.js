import Category from '../../models/categoryModel.js'

export const getCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Number of categories per page
        const skip = (page - 1) * limit;
        
        // Get total count of categories
        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        
        // Get categories for current page
        const categories = await Category.find()
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit);
        
        // Pagination data
        const pagination = {
            currentPage: page,
            totalPages: totalPages,
            limit: limit,
            totalDocs: totalCategories,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages
        };
        
        res.render('admin/categories', {
            categories,
            pagination,
            currentPage: page,
            totalPages,
            limit,
            totalCategories,
            path: req.path,
            title: 'Categories'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
}

export const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name.trim() || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Category name and description are required'
            });
        }

        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category already exists'
            });
        }

        const formattedName = name.trim()
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase());

        const category = new Category({
            name: formattedName,
            description: description.trim()
        });

        await category.save();

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category
        });
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
};

export const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        res.json({ success: true, category });
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category'
        });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category updated successfully',
            category
        });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        await Product.updateMany(
            { categoryId: req.params.id },
            { $unset: { categoryId: 1 } }
        );

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
}




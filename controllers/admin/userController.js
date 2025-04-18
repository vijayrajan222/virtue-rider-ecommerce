import User from '../../models/userModel.js';
const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Items per page
        const skip = (page - 1) * limit;

        // Get total count of users
        const totalUsers = await User.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);

        const userList = await User.find()
            .select('firstname lastname email isBlocked isVerified')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const mappedUserList = userList.map(user => ({
            _id: user._id,
            firstName: user.firstname,
            lastName: user.lastname,
            email: user.email,
            isBlocked: user.isBlocked,
            isVerified: user.isVerified
        }));

        res.render('admin/userList', {
            userList: mappedUserList,
            currentPage: page,
            totalPages,
            totalUsers,
            path: req.path,
            title: 'Users',
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            limit
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error fetching users');
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({
                success: true,
                message: `User successfully ${user.isBlocked ? 'blocked' : 'unblocked'}`
            });
        }

        res.redirect('/admin/userList');
    } catch (err) {
        console.error(err);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Server Error' });
        }
        res.status(500).send('Server Error');
    }
};


export {
    getUsers,
    toggleUserStatus
}